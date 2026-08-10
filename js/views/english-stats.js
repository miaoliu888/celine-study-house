/* ============================================================
   views/english-stats.js — 学习统计
   ============================================================ */

import { Store } from '../store.js';
import { todayStr, render, html, addDays } from '../utils.js';
import { bunny } from '../bunny.js';

export async function renderEnglishStats(root) {
  const today = new Date();
  const weekAgo = addDays(today, -6);
  const monthAgo = addDays(today, -29);

  const todayKey = todayStr(today);
  const weekKey = todayStr(weekAgo);
  const monthKey = todayStr(monthAgo);

  const allProgress = await Store.getAllProgress();
  const allWrong = await Store.getAllWrong();
  const allDict = await Store.getAll('dictation_attempt');

  const todayNew = allProgress.filter((p) => p.first_seen_date === todayKey).length;
  const weekNew = allProgress.filter((p) => (p.first_seen_date || '') >= weekKey).length;
  const monthNew = allProgress.filter((p) => (p.first_seen_date || '') >= monthKey).length;
  const totalLearned = allProgress.length;
  const mastered = allProgress.filter((p) => p.mastery >= 2).length;
  const wrongCount = allWrong.length;

  // 本周趋势
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    const k = todayStr(d);
    const newCount = allProgress.filter((p) => p.first_seen_date === k).length;
    const atts = allDict.filter((a) => a.date === k);
    const correct = atts.filter((a) => a.is_correct).length;
    const total = atts.length;
    const rate = total ? correct / total : 0;
    days.push({ k, newCount, rate, total });
  }
  const trendSvg = renderTrend(days);

  // 各主题错词
  const words = await Store.getAllWords();
  const wordMap = new Map(words.map((w) => [w.id, w]));
  const topicStats = new Map();
  for (const w of allWrong) {
    const word = wordMap.get(w.word_id);
    if (!word) continue;
    const t = word.topic || 'Other';
    const cur = topicStats.get(t) || { count: 0 };
    cur.count += 1;
    topicStats.set(t, cur);
  }
  const topicArr = Array.from(topicStats.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, 6);

  root.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">📈 学习统计</div>
        <div class="page-subtitle">今天 / 本周 / 累计</div>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat">
        <div class="stat__lbl">今日新词</div>
        <div class="stat__val">${todayNew}</div>
      </div>
      <div class="stat">
        <div class="stat__lbl">本周新词</div>
        <div class="stat__val">${weekNew}</div>
      </div>
      <div class="stat">
        <div class="stat__lbl">本月新词</div>
        <div class="stat__val">${monthNew}</div>
      </div>
      <div class="stat">
        <div class="stat__lbl">累计学习</div>
        <div class="stat__val">${totalLearned}</div>
      </div>
      <div class="stat stat--mint">
        <div class="stat__lbl">已掌握</div>
        <div class="stat__val">${mastered}</div>
      </div>
      <div class="stat stat--pink">
        <div class="stat__lbl">错词</div>
        <div class="stat__val">${wrongCount}</div>
      </div>
    </div>

    <div class="section card">
      <div class="card__head">
        <div class="card__title">最近 7 天 · 新词趋势</div>
      </div>
      <div class="chart">${trendSvg}</div>
    </div>

    ${topicArr.length ? `
      <div class="section card">
        <div class="card__head">
          <div class="card__title">错词主题分布 Top 6</div>
        </div>
        <div class="col" style="gap:6px;">
          ${topicArr.map(([t, v]) => `
            <div class="row" style="gap:8px;">
              <div style="width:80px;font-size:13px;color:var(--c-ink-700);">${escapeHtml(t)}</div>
              <div class="bar" style="flex:1;height:8px;"><div class="bar__fill" style="width:${Math.min(100, v.count * 15)}%"></div></div>
              <div style="width:36px;text-align:right;font-size:13px;color:var(--c-ink-500);">${v.count}</div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

function renderTrend(days) {
  const W = 600, H = 160, P = 24;
  const max = Math.max(1, ...days.map((d) => d.newCount));
  const stepX = (W - P * 2) / (days.length - 1);
  const points = days.map((d, i) => {
    const x = P + i * stepX;
    const y = H - P - (d.newCount / max) * (H - P * 2);
    return [x, y, d];
  });
  const pathD = points.map((p, i) => (i === 0 ? `M${p[0]} ${p[1]}` : `L${p[0]} ${p[1]}`)).join(' ');
  const fillD = `${pathD} L${points[points.length - 1][0]} ${H - P} L${P} ${H - P} Z`;
  return `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#6FA8FF" stop-opacity=".25"/>
          <stop offset="100%" stop-color="#6FA8FF" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${[0, 1, 2, 3].map((i) => `<line x1="${P}" y1="${P + i * (H - P * 2) / 3}" x2="${W - P}" y2="${P + i * (H - P * 2) / 3}" stroke="#E2E6F1" stroke-dasharray="2 3"/>`).join('')}
      <path d="${fillD}" fill="url(#tg)"/>
      <path d="${pathD}" fill="none" stroke="#6FA8FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${points.map(([x, y, d]) => `
        <circle cx="${x}" cy="${y}" r="3" fill="#fff" stroke="#6FA8FF" stroke-width="2"/>
        <text x="${x}" y="${H - 6}" font-size="10" text-anchor="middle" fill="#6B7592">${d.k.slice(5)}</text>
        <text x="${x}" y="${y - 8}" font-size="10" text-anchor="middle" fill="#3B4760" font-weight="600">${d.newCount}</text>
      `).join('')}
    </svg>
  `;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
