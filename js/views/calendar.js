/* ============================================================
   views/calendar.js — 学习日历
   ============================================================ */

import { Store } from '../store.js';
import { todayStr, render, html, parseDate, addDays, formatDateZh } from '../utils.js';
import { bunny } from '../bunny.js';

let viewYear, viewMonth;

export async function renderCalendar(root) {
  if (!viewYear) {
    const d = new Date();
    viewYear = d.getFullYear();
    viewMonth = d.getMonth();
  }

  const first = new Date(viewYear, viewMonth, 1);
  const startDow = first.getDay(); // 0 = Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  // 上月补位
  for (let i = 0; i < startDow; i++) {
    const d = new Date(viewYear, viewMonth, -startDow + i + 1);
    cells.push({ date: d, other: true });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ date: new Date(viewYear, viewMonth, i), other: false });
  }
  // 下月补位
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: addDays(last, 1), other: true });
  }

  // 数据
  const allDaily = await Store.getAllDaily();
  const dailyMap = new Map(allDaily.map((d) => [d.date, d]));

  const todayK = todayStr();
  const monthLabel = `${viewYear}年${viewMonth + 1}月`;

  root.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">🗓️ 学习日历</div>
        <div class="page-subtitle">蓝兔脚印是完成日</div>
      </div>
    </div>

    <div class="cal">
      <div class="cal__head">
        <div class="cal__title">${monthLabel}</div>
        <div class="cal__nav">
          <button data-act="prev">‹</button>
          <button data-act="today">今</button>
          <button data-act="next">›</button>
        </div>
      </div>
      <div class="cal__grid">
        ${['日','一','二','三','四','五','六'].map((d) => `<div class="cal__dow">${d}</div>`).join('')}
        ${cells.map((c) => {
          const k = todayStr(c.date);
          const rec = dailyMap.get(k);
          const isToday = k === todayK;
          let cls = 'cal__cell';
          if (c.other) cls += ' other';
          if (isToday) cls += ' today';
          if (rec && rec.reward_earned) cls += ' done';
          else if (rec && rec.total_completed > 0) cls += ' partial';
          return `<div class="${cls}" data-date="${k}">${c.date.getDate()}${rec ? '<span class="mark"></span>' : ''}</div>`;
        }).join('')}
      </div>
      <div class="cal__legend">
        <span><span class="dot" style="background:#6FA8FF;"></span>全部完成</span>
        <span><span class="dot" style="background:#DCEBFF;"></span>部分完成</span>
        <span><span class="dot" style="background:#C3CADA;"></span>无记录</span>
      </div>
    </div>

    <div id="day-detail" class="section"></div>
  `;

  // 绑定
  root.querySelector('[data-act="prev"]').addEventListener('click', () => {
    viewMonth -= 1;
    if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
    renderCalendar(root);
  });
  root.querySelector('[data-act="next"]').addEventListener('click', () => {
    viewMonth += 1;
    if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
    renderCalendar(root);
  });
  root.querySelector('[data-act="today"]').addEventListener('click', () => {
    const d = new Date();
    viewYear = d.getFullYear();
    viewMonth = d.getMonth();
    renderCalendar(root);
  });

  root.querySelectorAll('.cal__cell').forEach((c) => {
    c.addEventListener('click', () => showDayDetail(c.dataset.date));
  });
}

async function showDayDetail(date) {
  const root = document.getElementById('day-detail');
  if (!root) return;
  const daily = (await Store.getDaily(date));
  const atts = await Store.getAttemptsByDate(date);
  const wrong = (await Store.getAllWrong()).filter((w) => w.last_wrong_date === date);
  const focus = await Store.getFocusByDate(date);
  const focusMin = Math.round(focus.reduce((s, f) => s + (f.completed ? f.duration_sec : 0), 0) / 60);
  const correct = atts.filter((a) => a.is_correct).length;
  const total = atts.length;
  const rate = total ? Math.round((correct / total) * 100) : 0;

  root.innerHTML = `
    <div class="card">
      <div class="card__head">
        <div class="card__title">${date}</div>
        ${daily && daily.reward_earned ? '<span class="tag mint">+¥1</span>' : ''}
      </div>
      ${!daily && !atts.length && !focus.length ? `
        <div class="muted">这天没有记录</div>
      ` : `
        <div class="col" style="gap:8px;">
          ${daily && daily.mood ? `<div>心情：${'😄🙂😐😟😪'[daily.mood - 1]}</div>` : ''}
          ${daily && daily.summary_text ? `<div style="background:var(--c-blue-50);padding:10px 12px;border-radius:12px;color:var(--c-ink-700);">${escapeHtml(daily.summary_text)}</div>` : ''}
          <div class="summary-grid">
            <div class="summary-card"><div class="summary-card__lbl">完成</div><div class="summary-card__val">${daily?.total_completed || 0}/${daily?.total_required || 0}</div></div>
            <div class="summary-card"><div class="summary-card__lbl">专注</div><div class="summary-card__val">${focusMin}<span style="font-size:12px;color:var(--c-ink-500);"> min</span></div></div>
            <div class="summary-card"><div class="summary-card__lbl">KET 正确率</div><div class="summary-card__val">${rate}%</div></div>
            <div class="summary-card"><div class="summary-card__lbl">新增错词</div><div class="summary-card__val">${wrong.length}</div></div>
          </div>
        </div>
      `}
    </div>
  `;
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
