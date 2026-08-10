/* ============================================================
   views/english.js — KET 英语首页
   ============================================================ */

import { Store } from '../store.js';
import { todayStr, render, html, toast } from '../utils.js';
import { bunny } from '../bunny.js';
import { getOrCreateDailySchedule } from '../scheduler.js';
import { getAllProgress, getAllWrong } from '../store.js';
import { addDays } from '../utils.js';

export async function renderEnglish(root) {
  const date = todayStr();
  let schedule;
  try {
    schedule = await getOrCreateDailySchedule(date);
  } catch (e) {
    schedule = { new_word_ids: [], review_word_ids: [] };
  }
  const newTotal = schedule.new_word_ids.length;
  const newDone = (await Store.getAttemptsByDate(date)).filter((a) => a.mode === 'new' && a.is_correct).length;
  const reviewTotal = schedule.review_word_ids.length;
  const reviewDone = (await Store.getAttemptsByDate(date)).filter((a) => a.mode === 'review' && a.is_correct).length;

  // 本周新词
  const weekWords = await countWeekNewWords();
  // 累计掌握
  const allProgress = await getAllProgress();
  const mastered = allProgress.filter((p) => p.mastery >= 2).length;
  const totalLearned = allProgress.length;
  // 错词
  const wrong = await getAllWrong();

  root.innerHTML = html`
    <div class="page-header">
      <div>
        <div class="page-title">🔤 KET 英语</div>
        <div class="page-subtitle">每天 20 个新词 · Cambridge A2 Key 词库</div>
      </div>
    </div>

    <a class="ket-hero" href="#/dictation" data-onclick="goDictation" style="text-decoration:none;color:inherit;">
      <div class="ket-hero__bunny">${bunny('speaker')}</div>
      <div class="ket-hero__body">
        <div class="ket-hero__title">今日 KET 听写</div>
        <div class="ket-hero__sub">新词 ${newDone}/${newTotal} · 复习 ${reviewDone}/${reviewTotal}</div>
      </div>
      <div class="ket-hero__cta">开始听写 →</div>
    </a>

    <div class="stat-grid" style="margin-top:18px;">
      <div class="stat">
        <div class="stat__lbl">本周新词</div>
        <div class="stat__val">${weekWords}</div>
      </div>
      <div class="stat stat--mint">
        <div class="stat__lbl">累计学习</div>
        <div class="stat__val">${totalLearned}</div>
      </div>
      <div class="stat stat--cream">
        <div class="stat__lbl">已掌握</div>
        <div class="stat__val">${mastered}</div>
      </div>
      <div class="stat stat--pink">
        <div class="stat__lbl">错词本</div>
        <div class="stat__val">${wrong.length}</div>
      </div>
    </div>

    <div class="section" style="margin-top:20px;">
      <div class="card__title" style="margin-bottom:10px;">学习模块</div>
      <div class="entry-grid">
        <a class="entry" href="#/dictation" data-onclick="goEntry1">
          <div class="entry__icon">✍️</div>
          <div class="entry__title">今日听写</div>
          <div class="entry__desc">每天 20 词新词 + 错词复习</div>
        </a>
        <a class="entry" href="#/wrong-words" data-onclick="goEntry2">
          <div class="entry__icon entry--cream" style="background:#FFF4DC;color:#B07A1F;">📕</div>
          <div class="entry__title">错词本</div>
          <div class="entry__desc">${wrong.length} 个待复习</div>
        </a>
        <a class="entry" href="#/vocab" data-onclick="goEntry3">
          <div class="entry__icon entry--mint" style="background:#E1F4EA;color:#2D7A56;">📚</div>
          <div class="entry__title">我的词库</div>
          <div class="entry__desc">已学 ${totalLearned} 词</div>
        </a>
        <a class="entry" href="#/english-stats" data-onclick="goEntry4">
          <div class="entry__icon entry--lilac" style="background:#EFE9FF;color:#6A55B5;">📈</div>
          <div class="entry__title">学习统计</div>
          <div class="entry__desc">查看学习趋势</div>
        </a>
      </div>
    </div>
  `;
}

async function countWeekNewWords() {
  const d = new Date();
  const start = addDays(d, -6);
  const all = await Store.getAllProgress();
  const startKey = todayStr(start);
  return all.filter((p) => (p.first_seen_date || '') >= startKey).length;
}
