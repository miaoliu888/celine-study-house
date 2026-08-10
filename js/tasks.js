/* ============================================================
   tasks.js — 任务系统
   ============================================================ */

import { Store } from './store.js';
import { todayStr } from './utils.js';

export const DEFAULT_TASKS = [
  // 语文
  { id: 'chn_recite', subject: 'chinese', title: '背诵文言文诗词', target: 1, unit: '首', enabled: true, required: true, order: 1, timer_enabled: true, split: 'none' },
  { id: 'chn_xes',    subject: 'chinese', title: '学而思暑假预复习', target: 1, unit: '天', enabled: true, required: true, order: 2, timer_enabled: true, split: 'none' },
  { id: 'chn_reading',subject: 'chinese', title: '28天晨读', target: 2, unit: '次', enabled: true, required: true, order: 3, timer_enabled: true, split: 'morning_evening' },

  // 英语
  { id: 'eng_abc',     subject: 'english', title: 'ABC Reading', target: 2, unit: '篇', enabled: true, required: true, order: 4, timer_enabled: true, split: 'none' },
  { id: 'eng_ket',     subject: 'english', title: 'KET 每日单词听写', target: 20, unit: '词', enabled: true, required: true, order: 5, timer_enabled: false, split: 'none' },
  { id: 'eng_writing', subject: 'english', title: '读写作高分范文', target: 1, unit: '篇', enabled: true, required: true, order: 6, timer_enabled: true, split: 'none' },
  { id: 'eng_paper',   subject: 'english', title: 'KET 真题训练', target: 1, unit: '套', enabled: true, required: false, order: 7, timer_enabled: true, split: 'none' },
  { id: 'eng_shiguang',subject: 'english', title: '拾光英语作业', target: 1, unit: '次', enabled: true, required: false, order: 8, timer_enabled: false, split: 'none' },

  // 数学
  { id: 'math_super',  subject: 'math', title: '计算小超市', target: 1, unit: '页', enabled: true, required: true, order: 9, timer_enabled: true, split: 'none' },
  { id: 'math_yuyou',  subject: 'math', title: '誉优暑假课', target: 1, unit: '课', enabled: true, required: true, order: 10, timer_enabled: true, split: 'none' },
  { id: 'math_g4',     subject: 'math', title: '四年级上册课文', target: 1, unit: '课', enabled: true, required: false, order: 11, timer_enabled: false, split: 'none' },
];

const SLOT = { none: 'single', morning_evening: 'am' }; // 同一 id 两个 slot: am, pm

export async function ensureTaskConfig() {
  const all = await Store.getAllTaskConfig();
  if (all.length) return all;
  for (const t of DEFAULT_TASKS) {
    await Store.putTaskConfig(t);
  }
  return await Store.getAllTaskConfig();
}

export async function getAllTasks() {
  const all = await ensureTaskConfig();
  return all.sort((a, b) => a.order - b.order);
}

export function logId(date, taskId, slot) {
  return `${date}__${taskId}__${slot}`;
}

/**
 * 取某日所有任务日志（已生成的）
 */
export async function getTodayLogs(date = todayStr()) {
  return await Store.getTaskLogsByDate(date);
}

export async function getTaskLog(date, taskId, slot = 'single') {
  return await Store.getTaskLog(logId(date, taskId, slot));
}

export async function setTaskProgress(date, taskId, slot, progress) {
  const id = logId(date, taskId, slot);
  const old = (await Store.getTaskLog(id)) || { id, date, task_id: taskId, slot, progress: 0, completed: false, focus_minutes: 0 };
  old.progress = progress;
  await Store.putTaskLog(old);
  return old;
}

export async function toggleTaskComplete(date, taskId, slot = 'single') {
  const id = logId(date, taskId, slot);
  const old = (await Store.getTaskLog(id)) || { id, date, task_id: taskId, slot, progress: 0, completed: false, focus_minutes: 0 };
  old.completed = !old.completed;
  if (old.completed) {
    // 进度至少为 1
    const task = (await getAllTasks()).find((t) => t.id === taskId);
    if (task) old.progress = Math.max(old.progress || 0, 1);
  }
  await Store.putTaskLog(old);
  return old;
}

export async function addFocusMinutes(date, taskId, slot, mins) {
  if (!taskId) return;
  const id = logId(date, taskId, slot);
  const old = (await Store.getTaskLog(id)) || { id, date, task_id: taskId, slot, progress: 0, completed: false, focus_minutes: 0 };
  old.focus_minutes = (old.focus_minutes || 0) + mins;
  await Store.putTaskLog(old);
}

/** 统计今日完成率 */
export async function getTodayProgress(date = todayStr()) {
  const tasks = (await getAllTasks()).filter((t) => t.enabled);
  const logs = await Store.getTaskLogsByDate(date);
  const logMap = new Map(logs.map((l) => [l.id, l]));

  let required = 0;
  let done = 0;
  for (const t of tasks) {
    if (!t.required) continue;
    required += t.target;
    if (t.split === 'morning_evening') {
      const am = logMap.get(logId(date, t.id, 'am'));
      const pm = logMap.get(logId(date, t.id, 'pm'));
      const amDone = am && am.completed;
      const pmDone = pm && pm.completed;
      const cnt = (amDone ? 1 : 0) + (pmDone ? 1 : 0);
      done += cnt;
    } else {
      const lg = logMap.get(logId(date, t.id, 'single'));
      const prog = lg ? (lg.completed ? t.target : (lg.progress || 0)) : 0;
      done += Math.min(prog, t.target);
    }
  }
  return { required, done, rate: required ? done / required : 0 };
}

export async function checkAndAward(date = todayStr()) {
  const { required, done, rate } = await getTodayProgress(date);
  if (required === 0) return { awarded: false, reason: 'no_required' };
  if (done < required) return { awarded: false, reason: 'incomplete', done, required };
  const daily = (await Store.getDaily(date)) || { date };
  if (daily.reward_earned) return { awarded: false, reason: 'already' };
  // 发奖
  await Store.putDaily({
    ...daily,
    date,
    total_required: required,
    total_completed: done,
    reward_earned: true,
  });
  await Store.addCoin({
    date,
    type: 'earn',
    amount: 1,
    reason: '今日全部完成',
    item: '',
  });
  return { awarded: true };
}
