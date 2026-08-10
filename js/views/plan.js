/* ============================================================
   views/plan.js — 今日计划
   ============================================================ */

import { Store } from '../store.js';
import { todayStr, render, html, toast, SUBJECT_META, confirmDialog, addDays, parseDate, formatDateZh } from '../utils.js';
import { getAllTasks, getTaskLog, setTaskProgress, toggleTaskComplete, addFocusMinutes, logId, getTodayProgress, checkAndAward } from '../tasks.js';
import { bunny } from '../bunny.js';

let filterSubject = 'all';

export async function renderPlan(root) {
  const date = todayStr();
  const tasks = (await getAllTasks()).filter((t) => t.enabled);
  const logs = await Store.getTaskLogsByDate(date);
  const logMap = new Map(logs.map((l) => [l.id, l]));

  // 找 split === 'morning_evening' 的任务，渲染 28 天日历
  const readingTask = tasks.find((t) => t.split === 'morning_evening');

  const subjects = [
    { key: 'all', label: '全部' },
    { key: 'chinese', label: '语文' },
    { key: 'english', label: '英语' },
    { key: 'math', label: '数学' },
  ];

  const visible = filterSubject === 'all' ? tasks : tasks.filter((t) => t.subject === filterSubject);

  // 按学科分组
  const bySubject = {};
  for (const t of visible) {
    if (!bySubject[t.subject]) bySubject[t.subject] = [];
    bySubject[t.subject].push(t);
  }

  const prog = await getTodayProgress(date);

  root.innerHTML = html`
    <div class="page-header">
      <div>
        <div class="page-title">✓ 今日计划</div>
        <div class="page-subtitle">${date} · 已完成 ${prog.done} / ${prog.required}</div>
      </div>
    </div>

    <div class="plan-toolbar">
      <div class="subject-toggle">
        ${subjects.map((s) => `<button class="${filterSubject === s.key ? 'on' : ''}" data-sub="${s.key}">${s.label}</button>`).join('')}
      </div>
      <div class="tiny">必做 ${prog.done}/${prog.required}</div>
    </div>

    ${readingTask ? renderReading28(readingTask, date) : ''}

    ${Object.keys(bySubject).length === 0 ? `
      <div class="card card--ghost" style="text-align:center;padding:32px 16px;">
        <div style="font-size:32px;">🐰</div>
        <div class="muted" style="margin-top:8px;">这个学科今天没有任务</div>
      </div>
    ` : Object.entries(bySubject).map(([sub, arr]) => `
      <div class="subject subject--${sub}">
        <span class="subject__dot"></span>
        <span class="subject__title">${SUBJECT_META[sub]?.name || sub}</span>
        <span class="subject__meta">${arr.length} 个任务</span>
      </div>
      <div class="col" style="gap:8px;">
        ${arr.map((t) => renderTask(t, date, logMap)).join('')}
      </div>
    `).join('')}
  `;

  // 绑定
  root.querySelectorAll('[data-sub]').forEach((b) => {
    b.addEventListener('click', () => {
      filterSubject = b.dataset.sub;
      renderPlan(root);
    });
  });

  // 28 天日历格子点击：直接给该天打卡（或取消）
  root.querySelectorAll('[data-reading-day]').forEach((el) => {
    el.addEventListener('click', async () => {
      const d = el.dataset.readingDay;
      const slot = el.dataset.slot;
      if (!d || !slot || !readingTask) return;
      await toggleReadingDay(readingTask.id, d, slot);
      renderPlan(root);
    });
  });

  // 任务操作
  root.querySelectorAll('[data-task]').forEach((card) => {
    const id = card.dataset.task;
    const slot = card.dataset.slot || 'single';
    const task = tasks.find((t) => t.id === id);

    // checkbox / 卡片点击 = 切换完成
    card.addEventListener('click', async (e) => {
      if (e.target.closest('[data-act]')) return;
      await toggleTask(date, id, slot, task);
    });

    // 按钮
    card.querySelectorAll('[data-act]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const act = btn.dataset.act;
        if (act === 'plus') await stepProgress(date, id, slot, task, +1);
        if (act === 'minus') await stepProgress(date, id, slot, task, -1);
        if (act === 'focus') navigateFocus(id, slot);
      });
    });
  });
}

// 28 天晨读 / 晚读日历
async function renderReading28(task, today) {
  // 28 天：从今天往前数 27 天 → 今天（28 格，按周排）
  const t = parseDate(today);
  const start = addDays(t, -27);
  // 拉这 28 天的 log
  const days = [];
  let amDone = 0, pmDone = 0, totalDays = 28;
  for (let i = 0; i < 28; i++) {
    const d = todayStr(addDays(start, i));
    const logs = await Store.getTaskLogsByDate(d);
    const am = logs.find((l) => l.task_id === task.id && l.slot === 'am');
    const pm = logs.find((l) => l.task_id === task.id && l.slot === 'pm');
    if (am && am.completed) amDone++;
    if (pm && pm.completed) pmDone++;
    days.push({ date: d, am: !!(am && am.completed), pm: !!(pm && pm.completed) });
  }
  const totalDone = amDone + pmDone;
  const totalSlots = 28 * 2;
  const pct = Math.round((totalDone / totalSlots) * 100);

  // 渲染：4 行 × 7 列，按周一开头
  const cells = [];
  // 补全首周（从周一开始）
  const firstDow = (parseDate(days[0].date).getDay() + 6) % 7; // 周一=0
  for (let i = 0; i < firstDow; i++) {
    cells.push(`<div class="rd__cell rd__cell--empty"></div>`);
  }
  for (const d of days) {
    const dt = parseDate(d.date);
    const isToday = d.date === today;
    const isFuture = dt > t;
    cells.push(`
      <div class="rd__cell ${isToday ? 'rd__cell--today' : ''} ${isFuture ? 'rd__cell--future' : ''}" data-date="${d.date}">
        <div class="rd__day">${dt.getDate()}</div>
        <div class="rd__row">
          <button class="rd__chip ${d.am ? 'rd__chip--on' : ''} ${isFuture ? 'rd__chip--disabled' : ''}" data-reading-day="${d.date}" data-slot="am" title="☀ 晨读" aria-label="☀ 晨读 ${d.date}">☀</button>
          <button class="rd__chip ${d.pm ? 'rd__chip--on' : ''} ${isFuture ? 'rd__chip--disabled' : ''}" data-reading-day="${d.date}" data-slot="pm" title="🌙 睡前读" aria-label="🌙 睡前读 ${d.date}">🌙</button>
        </div>
      </div>
    `);
  }
  while (cells.length % 7 !== 0) cells.push(`<div class="rd__cell rd__cell--empty"></div>`);

  return `
    <div class="card rd">
      <div class="card__head">
        <div class="card__title">📖 ${escapeHtml(task.title)} · 28 天打卡</div>
        <div class="tiny">${amDone} / 28 ☀ &nbsp;·&nbsp; ${pmDone} / 28 🌙</div>
      </div>
      <div class="rd__bar">
        <div class="bar bar--mint"><div class="bar__fill" style="width:${pct}%"></div></div>
        <div class="tiny" style="margin-top:4px;">已读 ${totalDone} / ${totalSlots} 次 · ${pct}%</div>
      </div>
      <div class="rd__weekdays">
        ${['一','二','三','四','五','六','日'].map((d) => `<div>${d}</div>`).join('')}
      </div>
      <div class="rd__grid">
        ${cells.join('')}
      </div>
      <div class="rd__legend tiny">
        <span><span class="rd__chip rd__chip--on" style="cursor:default;">☀</span> 晨读</span>
        <span><span class="rd__chip rd__chip--on" style="cursor:default;">🌙</span> 睡前读</span>
        <span>· 点格子直接打卡</span>
      </div>
    </div>
  `;
}

async function toggleReadingDay(taskId, date, slot) {
  try {
    const lg = await getTaskLog(date, taskId, slot);
    if (lg && lg.completed) {
      // 取消
      await setTaskProgress(date, taskId, slot, 0);
      const cur = await getTaskLog(date, taskId, slot);
      if (cur) {
        cur.completed = false;
        await Store.putTaskLog(cur);
      }
      toast('已取消打卡', 'info');
    } else {
      await toggleTaskComplete(date, taskId, slot);
      toast('✓ 已打卡', 'success');
    }
  } catch (e) {
    console.error(e);
    toast('操作失败，请重试', 'warn');
  }
  // 检查发奖
  const prog = await getTodayProgress(date);
  if (prog.done >= prog.required && prog.required > 0) {
    const r = await checkAndAward(date);
    if (r.awarded) toast('🎉 今日全部完成！+¥1', 'success');
  }
  // 始终重渲染计划视图，保证视觉与数据一致
  const main = document.getElementById('main');
  if (main) renderPlan(main);
  window.dispatchEvent(new CustomEvent('plan:update'));
}

function renderTask(t, date, logMap) {
  if (t.split === 'morning_evening') {
    const am = logMap.get(logId(date, t.id, 'am')) || { progress: 0, completed: false };
    const pm = logMap.get(logId(date, t.id, 'pm')) || { progress: 0, completed: false };
    return `
      <div class="card" style="padding:14px;">
        <div class="row" style="align-items:center;margin-bottom:8px;">
          <div class="grow">
            <div style="font-weight:700;font-size:15px;">${t.title}</div>
            <div class="tiny">☀ 起床读 / 🌙 睡前读</div>
          </div>
          ${t.timer_enabled ? `<button class="btn btn--ghost btn--sm" data-act="focus" data-task="${t.id}" data-slot="am">开始 20 分钟</button>` : ''}
        </div>
        <div class="col" style="gap:8px;">
          ${renderSplitRow(t, date, 'am', '☀ 起床读', am)}
          ${renderSplitRow(t, date, 'pm', '🌙 睡前读', pm)}
        </div>
      </div>
    `;
  }
  const lg = logMap.get(logId(date, t.id, 'single')) || { progress: 0, completed: false };
  const done = lg.completed || lg.progress >= t.target;
  return `
    <div class="task ${done ? 'done' : ''}" data-task="${t.id}" data-slot="single" style="cursor:pointer;">
      <button class="task__check" aria-label="完成"></button>
      <div class="task__body">
        <div class="task__title">${t.title}</div>
        <div class="task__meta">
          <span>${t.target} ${t.unit}</span>
          ${t.required ? '<span class="tag">必做</span>' : '<span class="tag">选做</span>'}
        </div>
      </div>
      <div class="task__act">
        ${t.target > 1 ? `
          <div class="stepper">
            <button data-act="minus">−</button>
            <span class="val">${Math.min(lg.progress || 0, t.target)}/${t.target}</span>
            <button data-act="plus">+</button>
          </div>
        ` : `<span class="task__progress">${done ? '✓' : ''}</span>`}
        ${t.timer_enabled ? `<button class="btn btn--ghost btn--sm" data-act="focus">开始 20 分钟</button>` : ''}
      </div>
    </div>
  `;
}

function renderSplitRow(t, date, slot, label, lg) {
  const done = lg.completed;
  return `
    <div class="row" data-task="${t.id}" data-slot="${slot}" style="padding:8px 10px;border-radius:12px;background:${done ? '#E5F2FF' : '#F7FAFF'};">
      <button class="task__check" style="width:24px;height:24px;" aria-label="完成"></button>
      <div class="grow">
        <div style="font-size:14px;font-weight:600;">${label}</div>
      </div>
      <span class="task__progress">${done ? '✓ 已读' : ''}</span>
    </div>
  `;
}

async function toggleTask(date, id, slot, task) {
  try {
    const lg = await getTaskLog(date, id, slot);
    if (lg && lg.completed) {
      // 取消完成
      await setTaskProgress(date, id, slot, 0);
      const cur = await getTaskLog(date, id, slot);
      if (cur) {
        cur.completed = false;
        await Store.putTaskLog(cur);
      }
      toast('已取消完成', 'info');
    } else {
      await toggleTaskComplete(date, id, slot);
      toast('✓ 已完成', 'success');
    }
  } catch (e) {
    console.error(e);
    toast('操作失败，请重试', 'warn');
  }
  // 检查发奖
  const p = await getTodayProgress(date);
  if (p.done >= p.required && p.required > 0) {
    const r = await checkAndAward(date);
    if (r.awarded) toast('🎉 今日全部完成！+¥1', 'success');
  }
  // 始终重渲染计划视图，保证视觉与数据一致（修复“点了没反应”）
  const main = document.getElementById('main');
  if (main) renderPlan(main);
  // 刷新首页进度
  window.dispatchEvent(new CustomEvent('plan:update'));
}

async function stepProgress(date, id, slot, task, delta) {
  const lg = (await getTaskLog(date, id, slot)) || { progress: 0, completed: false, focus_minutes: 0 };
  let p = (lg.progress || 0) + delta;
  if (p < 0) p = 0;
  if (p > task.target) p = task.target;
  lg.progress = p;
  lg.completed = p >= task.target;
  await Store.putTaskLog(lg);
  const main = document.getElementById('main');
  if (main) renderPlan(main);
  window.dispatchEvent(new CustomEvent('plan:update'));
}

function navigateFocus(taskId, slot) {
  location.hash = `#/focus?task=${encodeURIComponent(taskId)}&slot=${encodeURIComponent(slot)}`;
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
