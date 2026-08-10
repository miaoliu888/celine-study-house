/* ============================================================
   review.js — 错词复习算法
   详见 docs/architecture.md §6
   ============================================================ */

import { Store } from './store.js';
import { todayStr, addDays } from './utils.js';

const INTERVALS = [1, 3, 7, 15]; // 连续 0/1/2/3+ 对 应下次间隔（天）

/**
 * 提交一次听写结果。
 * @param wordId 单词 id
 * @param mode 'new' | 'review'
 * @param isCorrect
 * @returns { newWrong: boolean, masteryChanged: number, interval: number }
 */
export async function submitAttempt(wordId, mode, isCorrect, typedAnswer) {
  // 更新 word_progress
  const progress = (await Store.getProgress(wordId)) || {
    word_id: wordId,
    first_seen_date: todayStr(),
    last_seen_date: todayStr(),
    correct_count: 0,
    wrong_count: 0,
    consecutive_correct: 0,
    mastery: 0,
  };
  progress.last_seen_date = todayStr();

  let result = {
    newWrong: false,
    masteryChanged: 0,
    interval: 1,
    mastery: progress.mastery || 0,
  };

  if (mode === 'new') {
    if (isCorrect) {
      progress.correct_count = (progress.correct_count || 0) + 1;
    } else {
      progress.wrong_count = (progress.wrong_count || 0) + 1;
    }
  } else {
    // review
    if (isCorrect) {
      progress.correct_count = (progress.correct_count || 0) + 1;
    } else {
      progress.wrong_count = (progress.wrong_count || 0) + 1;
    }
  }
  await Store.putProgress(progress);

  // 错词本
  let wrong = await Store.getWrong(wordId);
  if (isCorrect) {
    // 处理 review 的对错
    if (mode === 'review' && wrong) {
      wrong.consecutive_correct = (wrong.consecutive_correct || 0) + 1;
      wrong.last_wrong_date = todayStr(); // 标记最近复习
      // mastery 提升
      const newMastery = computeMastery(wrong.consecutive_correct);
      if (newMastery > (wrong.mastery || 0)) {
        result.masteryChanged = newMastery - (wrong.mastery || 0);
        wrong.mastery = newMastery;
      }
      // 计算下次复习
      const idx = Math.min(wrong.consecutive_correct, INTERVALS.length - 1);
      const days = INTERVALS[idx];
      result.interval = days;
      wrong.next_review_date = fmt(addDays(new Date(), days));
      if (wrong.mastery >= 2) {
        // 已掌握：保留记录但不再排复习
        wrong.next_review_date = '9999-12-31';
      }
      await Store.putWrong(wrong);
      result.mastery = wrong.mastery;
    } else if (mode === 'new' && wrong) {
      // 新词模式中，恰好是之前已标记为错词（理论不该发生但兜底）
      wrong.consecutive_correct = (wrong.consecutive_correct || 0) + 1;
      const newMastery = computeMastery(wrong.consecutive_correct);
      if (newMastery > (wrong.mastery || 0)) {
        result.masteryChanged = newMastery - (wrong.mastery || 0);
        wrong.mastery = newMastery;
      }
      const idx = Math.min(wrong.consecutive_correct, INTERVALS.length - 1);
      const days = INTERVALS[idx];
      result.interval = days;
      wrong.next_review_date = fmt(addDays(new Date(), days));
      if (wrong.mastery >= 2) wrong.next_review_date = '9999-12-31';
      await Store.putWrong(wrong);
      result.mastery = wrong.mastery;
    }
  } else {
    // 错
    if (!wrong) {
      wrong = {
        word_id: wordId,
        first_wrong_date: todayStr(),
        last_wrong_date: todayStr(),
        wrong_count: 1,
        last_user_answer: typedAnswer || '',
        next_review_date: fmt(addDays(new Date(), 1)),
        mastery: 0,
        consecutive_correct: 0,
      };
      result.newWrong = true;
    } else {
      wrong.wrong_count = (wrong.wrong_count || 0) + 1;
      wrong.last_wrong_date = todayStr();
      wrong.last_user_answer = typedAnswer || '';
      wrong.consecutive_correct = 0;
      // mastery 降一级
      if ((wrong.mastery || 0) > 0) {
        wrong.mastery = wrong.mastery - 1;
      }
      wrong.next_review_date = fmt(addDays(new Date(), 1));
    }
    await Store.putWrong(wrong);
    result.mastery = wrong.mastery;
  }

  return result;
}

function computeMastery(consecutive) {
  if (consecutive >= 4) return 2;
  if (consecutive >= 3) return 1;
  return 0;
}

function fmt(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 拼写判断：忽略前后空格、忽略大小写 */
export function judgeSpelling(correct, typed) {
  if (typed == null) return false;
  const a = String(correct).trim().toLowerCase();
  const b = String(typed).trim().toLowerCase();
  return a === b;
}

/** 高亮对比两个字符串（用 span 包字母） */
export function diffLetters(correct, typed) {
  const a = String(correct).toLowerCase();
  const b = String(typed || '').toLowerCase();
  const max = Math.max(a.length, b.length);
  let html = '';
  for (let i = 0; i < max; i++) {
    const ca = a[i] || '';
    const cb = b[i] || '';
    if (ca && cb) {
      if (ca === cb) {
        html += `<span class="letter ok">${escapeHtml(ca)}</span>`;
      } else {
        html += `<span class="letter err">${escapeHtml(cb)}</span>`;
      }
    } else if (ca && !cb) {
      html += `<span class="letter miss">${escapeHtml(ca)}</span>`;
    } else if (!ca && cb) {
      html += `<span class="letter err">${escapeHtml(cb)}</span>`;
    }
  }
  return html;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
