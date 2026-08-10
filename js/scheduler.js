/* ============================================================
   scheduler.js — 每日 20 词调度
   详见 docs/architecture.md §5
   ============================================================ */

import { Store } from './store.js';
import { todayStr, shuffle, addDays } from './utils.js';
import { KET_TOPICS } from './ket-db.js';

const MAX_NEW_PER_DAY = 20;
const MAX_REVIEW_PER_DAY = 30;

const DIFFICULTY_TARGET = { 1: 8, 2: 8, 3: 4 };
const TOPIC_MAX = 4; // 单个主题最多几个

/**
 * 拿今天（或指定日期）的 schedule，若不存在则生成。
 * 关键不变量：同一 date 调用 N 次永远返回同一份。
 */
export async function getOrCreateDailySchedule(date = todayStr()) {
  let s = await Store.getSchedule(date);
  if (s) return s;

  // 取全部词
  const allWords = await Store.getAllWords();
  if (!allWords.length) {
    throw new Error('词库为空，请先初始化');
  }
  const allProgress = await Store.getAllProgress();
  const progressMap = new Map(allProgress.map((p) => [p.word_id, p]));

  // 候选池 A：从未作为新词出现
  const poolA = allWords.filter((w) => !progressMap.has(w.id));
  // 候选池 B：已学过但未掌握
  const poolB = allWords.filter((w) => {
    const p = progressMap.get(w.id);
    return p && (p.mastery || 0) < 2;
  });

  // 合并去重（A 优先）
  const newWords = pickNewWords(poolA, poolB, MAX_NEW_PER_DAY);

  // 写 word_progress（首次学习标记）
  const today = date;
  for (const w of newWords) {
    if (!progressMap.has(w.id)) {
      await Store.putProgress({
        word_id: w.id,
        first_seen_date: today,
        last_seen_date: today,
        correct_count: 0,
        wrong_count: 0,
        consecutive_correct: 0,
        mastery: 0,
      });
    }
  }

  // 复习词
  const reviewWordIds = await pickReviewWords(date);

  s = {
    date,
    new_word_ids: newWords.map((w) => w.id),
    review_word_ids: reviewWordIds,
    started_at: Date.now(),
    completed_at: null,
    new_score: { correct: 0, wrong: 0 },
    review_score: { correct: 0, wrong: 0 },
  };
  await Store.putSchedule(s);
  return s;
}

/** 选新词：主题均衡 + 难度配比 */
function pickNewWords(poolA, poolB, n) {
  // 合并去重
  const used = new Set();
  const candidates = [];
  for (const w of [...poolA, ...poolB]) {
    if (used.has(w.id)) continue;
    used.add(w.id);
    candidates.push(w);
  }
  if (!candidates.length) return [];

  // 按主题分组
  const byTopic = new Map();
  for (const w of candidates) {
    const t = w.topic || 'Other';
    if (!byTopic.has(t)) byTopic.set(t, []);
    byTopic.get(t).push(w);
  }

  // 按难度分组（每个主题内的）
  const byTopicDiff = new Map();
  for (const [t, arr] of byTopic.entries()) {
    const d1 = arr.filter((w) => (w.difficulty || 2) === 1);
    const d2 = arr.filter((w) => (w.difficulty || 2) === 2);
    const d3 = arr.filter((w) => (w.difficulty || 2) === 3);
    byTopicDiff.set(t, { d1: shuffle(d1), d2: shuffle(d2), d3: shuffle(d3) });
  }

  // 主题轮转：每轮取每个主题一个、每个主题最多 TOPIC_MAX
  const topics = shuffle(KET_TOPICS.filter((t) => byTopic.has(t)));
  const result = [];
  const topicCount = new Map();

  // 难度目标（按总可用量缩放）
  const total = candidates.length;
  let targetD1 = DIFFICULTY_TARGET[1];
  let targetD2 = DIFFICULTY_TARGET[2];
  let targetD3 = DIFFICULTY_TARGET[3];
  if (total < n) {
    targetD1 = Math.floor((DIFFICULTY_TARGET[1] / 20) * total);
    targetD2 = Math.floor((DIFFICULTY_TARGET[2] / 20) * total);
    targetD3 = total - targetD1 - targetD2;
    if (targetD3 < 0) targetD3 = 0;
  }
  let gotD1 = 0, gotD2 = 0, gotD3 = 0;

  // 多轮抽取
  let safety = 0;
  while (result.length < n && safety++ < 200) {
    let progressed = false;
    for (const t of topics) {
      if (result.length >= n) break;
      const usedInTopic = topicCount.get(t) || 0;
      if (usedInTopic >= TOPIC_MAX) continue;
      const bucket = byTopicDiff.get(t);
      // 选哪个难度：按剩余配额决定
      const remain = n - result.length;
      const d1Left = targetD1 - gotD1;
      const d2Left = targetD2 - gotD2;
      const d3Left = targetD3 - gotD3;
      let pickBucket = null;
      if (d1Left > 0 && bucket.d1.length) { pickBucket = 'd1'; }
      else if (d2Left > 0 && bucket.d2.length) { pickBucket = 'd2'; }
      else if (d3Left > 0 && bucket.d3.length) { pickBucket = 'd3'; }
      else if (bucket.d1.length) pickBucket = 'd1';
      else if (bucket.d2.length) pickBucket = 'd2';
      else if (bucket.d3.length) pickBucket = 'd3';
      if (!pickBucket) continue;
      const w = bucket[pickBucket].shift();
      if (!w) continue;
      result.push(w);
      topicCount.set(t, usedInTopic + 1);
      if (pickBucket === 'd1') gotD1++;
      else if (pickBucket === 'd2') gotD2++;
      else gotD3++;
      progressed = true;
      if (remain <= 0) break;
    }
    if (!progressed) break; // 词库空了
  }

  return result;
}

/** 选今日复习错词 */
async function pickReviewWords(date) {
  const allWrong = await Store.getAllWrong();
  const due = allWrong
    .filter((w) => (w.next_review_date || '') <= date)
    .sort((a, b) => (a.last_wrong_date || '').localeCompare(b.last_wrong_date || ''))
    .slice(0, MAX_REVIEW_PER_DAY);
  return due.map((w) => w.word_id);
}

/** 是否今天已有 schedule */
export async function hasTodaySchedule(date = todayStr()) {
  const s = await Store.getSchedule(date);
  return !!s;
}

/** 标记今天完成 */
export async function markTodayComplete(date, mode, correct, wrong) {
  const s = await Store.getSchedule(date);
  if (!s) return;
  if (mode === 'new') s.new_score = { correct, wrong };
  if (mode === 'review') s.review_score = { correct, wrong };
  s.completed_at = Date.now();
  await Store.putSchedule(s);
}
