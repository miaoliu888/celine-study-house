/* ============================================================
   views/focus.js — 番茄钟
   ============================================================ */

import { Store } from '../store.js';
import { todayStr, render, html, toast, confirmDialog, fmtClock } from '../utils.js';
import { bunny } from '../bunny.js';
import { Pomodoro, TIMER_STATE, getTodayFocusMinutes } from '../timer.js';
import { getAllTasks, toggleTaskComplete, setTaskProgress, logId } from '../tasks.js';

const TIPS = ['喝点水 💧', '看看远处 👀', '起来走走 🚶‍♀️', '放松肩膀 🙆‍♀️', '深呼吸 🌿', '伸个懒腰 🐰'];

export async function renderFocus(root, params = {}) {
  const taskId = params.task || null;
  const slot = params.slot || 'single';
  const task = taskId ? (await getAllTasks()).find((t) => t.id === taskId) : null;

  // 读设置
  const all = await Store.getAllSettings();
  const focusMin = (all.find((s) => s.key === 'focus_minutes')?.value) || 20;
  const breakMin = (all.find((s) => s.key === 'break_minutes')?.value) || 5;

  // 实例化
  if (!root._pomo || root._pomoFocusMin !== focusMin || root._pomoBreakMin !== breakMin) {
    if (root._pomo) root._pomo.stop();
    const pomo = new Pomodoro({
      focusSec: focusMin * 60,
      breakSec: breakMin * 60,
      onTick: (remain) => updateClock(root, pomo, remain),
      onStateChange: (state) => updateState(root, pomo, state, task, slot, focusMin, breakMin),
      onComplete: () => onFocusComplete(root, task, slot),
      taskId,
      slot,
    });
    root._pomo = pomo;
    root._pomoFocusMin = focusMin;
    root._pomoBreakMin = breakMin;
  }
  const pomo = root._pomo;
  pomo.setDurations(focusMin, breakMin);

  // 渲染初始界面
  renderFocusUI(root, pomo, task, slot, focusMin, breakMin);
  bindFocus(root, pomo, task, slot);
}

function renderFocusUI(root, pomo, task, slot, focusMin, breakMin) {
  const state = pomo.state;
  const isIdle = state === TIMER_STATE.IDLE;
  const isFocus = state === TIMER_STATE.FOCUS;
  const isBreak = state === TIMER_STATE.BREAK;
  const isDone = state === TIMER_STATE.DONE;
  const taskTitle = task ? task.title : '自由专注';
  const remain = pomo.remain;
  const total = isBreak ? breakMin * 60 : focusMin * 60;
  const progress = total ? (1 - remain / total) * 100 : 0;
  const tip = TIPS[Math.floor(Math.random() * TIPS.length)];

  root.innerHTML = `
    <div class="focus">
      <div class="focus__bunny">${bunny(isFocus ? 'focus' : isBreak ? 'sleep' : isDone ? 'coin' : 'happy')}</div>
      <div class="focus__title">${isBreak ? '休息一下～' : isDone ? '完成！' : '专注中'}</div>
      <div class="focus__task">${escapeHtml(taskTitle)}${slot === 'am' ? ' · ☀ 晨读' : slot === 'pm' ? ' · 🌙 睡前读' : ''}</div>

      <div class="focus__clock" style="--p:${progress}%;">
        <div class="focus__clock-inner">${fmtClock(remain)}</div>
      </div>

      ${isIdle ? `
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn btn--lg" data-act="start">开始 ${focusMin} 分钟</button>
        </div>
        <p class="muted tiny" style="margin-top:10px;">完成后会提醒你打卡</p>
      ` : isFocus ? `
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn btn--ghost" data-act="stop">放弃</button>
        </div>
      ` : isBreak ? `
        <div class="focus__break-list">
          <div class="tip">${tip}</div>
        </div>
        <div class="row" style="justify-content:center;gap:8px;margin-top:14px;">
          <button class="btn" data-act="skip-break">跳过休息</button>
        </div>
      ` : `
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn btn--lg" data-act="finish">完成 · 打卡</button>
          <button class="btn btn--ghost" data-act="cont">继续学习</button>
        </div>
      `}
    </div>
  `;
}

function bindFocus(root, pomo, task, slot) {
  root.querySelector('[data-act="start"]')?.addEventListener('click', () => {
    pomo.start();
  });
  root.querySelector('[data-act="stop"]')?.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: '放弃本轮专注？', desc: '已坚持的时间不会计入。' });
    if (ok) {
      pomo.stop();
      renderFocusUI(root, pomo, task, slot, root._pomoFocusMin, root._pomoBreakMin);
    }
  });
  root.querySelector('[data-act="skip-break"]')?.addEventListener('click', () => {
    pomo.pause();
    pomo.state = TIMER_STATE.DONE;
    updateState(root, pomo, TIMER_STATE.DONE, task, slot, root._pomoFocusMin, root._pomoBreakMin);
  });
  root.querySelector('[data-act="finish"]')?.addEventListener('click', async () => {
    if (task) {
      // 自动打卡
      const date = todayStr();
      const id = logId(date, task.id, slot);
      const old = (await Store.getTaskLog(id)) || { id, date, task_id: task.id, slot, progress: 0, completed: false, focus_minutes: 0 };
      old.completed = true;
      old.progress = Math.max(old.progress || 0, 1);
      await Store.putTaskLog(old);
      toast('已打卡 ✓', 'success');
    }
    pomo.stop();
    location.hash = '#/plan';
  });
  root.querySelector('[data-act="cont"]')?.addEventListener('click', () => {
    pomo.stop();
    location.hash = '#/plan';
  });
}

function updateClock(root, pomo, remain) {
  const el = root.querySelector('.focus__clock-inner');
  if (el) el.innerHTML = fmtClock(remain);
  const total = (pomo.state === TIMER_STATE.BREAK ? root._pomoBreakMin * 60 : root._pomoFocusMin * 60);
  const progress = total ? (1 - remain / total) * 100 : 0;
  const clock = root.querySelector('.focus__clock');
  if (clock) clock.style.setProperty('--p', `${progress}%`);
}

function updateState(root, pomo, state, task, slot, focusMin, breakMin) {
  renderFocusUI(root, pomo, task, slot, focusMin, breakMin);
  bindFocus(root, pomo, task, slot);
}

function onFocusComplete(root, task, slot) {
  toast('专注完成！休息一下吧～', 'success');
  // 重新渲染
  if (root._pomo) {
    renderFocusUI(root, root._pomo, task, slot, root._pomoFocusMin, root._pomoBreakMin);
    bindFocus(root, root._pomo, task, slot);
  }
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
