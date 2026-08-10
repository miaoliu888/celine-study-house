/* ============================================================
   timer.js — 番茄专注
   ============================================================ */

import { Store } from './store.js';
import { todayStr } from './utils.js';

export const TIMER_STATE = {
  IDLE: 'idle',
  FOCUS: 'focus',
  BREAK: 'break',
  DONE: 'done',
};

export class Pomodoro {
  constructor({ focusSec, breakSec, onTick, onStateChange, onComplete, taskId, slot }) {
    this.focusSec = focusSec;
    this.breakSec = breakSec;
    this.onTick = onTick || (() => {});
    this.onStateChange = onStateChange || (() => {});
    this.onComplete = onComplete || (() => {});
    this.taskId = taskId || null;
    this.slot = slot || 'single';

    this.state = TIMER_STATE.IDLE;
    this.remain = focusSec;
    this.timer = null;
    this.startedAt = null;
    this.completed = false;
  }

  setDurations(focusMin, breakMin) {
    this.focusSec = focusMin * 60;
    this.breakSec = breakMin * 60;
    if (this.state === TIMER_STATE.IDLE) this.remain = this.focusSec;
  }

  start() {
    if (this.timer) return;
    this.state = TIMER_STATE.FOCUS;
    this.remain = this.focusSec;
    this.startedAt = Date.now();
    this.completed = false;
    this.onStateChange(this.state);
    this.onTick(this.remain);
    this.timer = setInterval(() => this._tick(), 1000);
  }

  _tick() {
    this.remain -= 1;
    this.onTick(this.remain);
    if (this.remain <= 0) {
      if (this.state === TIMER_STATE.FOCUS) {
        // 焦点完成
        this.completed = true;
        this._recordSession();
        this.state = TIMER_STATE.BREAK;
        this.remain = this.breakSec;
        this.onStateChange(this.state);
        this.onComplete({ completed: true });
      } else if (this.state === TIMER_STATE.BREAK) {
        // 休息结束
        this.state = TIMER_STATE.DONE;
        this.onStateChange(this.state);
        this._stopTimer();
      }
    }
  }

  _recordSession() {
    const minutes = Math.round(this.focusSec / 60);
    Store.addFocus({
      date: todayStr(),
      task_id: this.taskId,
      started_at: this.startedAt,
      duration_sec: this.focusSec,
      completed: true,
    });
    if (this.taskId) {
      // 通知任务系统增加专注时长
      import('./tasks.js').then(({ addFocusMinutes }) => {
        addFocusMinutes(todayStr(), this.taskId, this.slot, minutes);
      });
    }
  }

  pause() {
    this._stopTimer();
  }

  stop() {
    // 用户中途停止
    if (this.state === TIMER_STATE.FOCUS && this.startedAt) {
      // 记录为未完成
      Store.addFocus({
        date: todayStr(),
        task_id: this.taskId,
        started_at: this.startedAt,
        duration_sec: this.focusSec - this.remain,
        completed: false,
      });
    }
    this._stopTimer();
    this.state = TIMER_STATE.IDLE;
    this.remain = this.focusSec;
    this.onStateChange(this.state);
  }

  _stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export async function getTodayFocusMinutes(date = todayStr()) {
  const sessions = await Store.getFocusByDate(date);
  return Math.round(sessions.reduce((s, x) => s + (x.completed ? x.duration_sec : 0), 0) / 60);
}
