/* ============================================================
   store.js — IndexedDB 封装
   库名: siven_study_house, version 1
   ============================================================ */

const DB_NAME = 'siven_study_house';
const DB_VERSION = 1;

const STORES = [
  'ket_vocabulary',
  'word_progress',
  'daily_vocabulary_schedule',
  'dictation_attempt',
  'wrong_word',
  'task_config',
  'task_log',
  'focus_session',
  'daily_record',
  'coin_ledger',
  'growth',
  'settings',
  'quote_cache',
];

let _db = null;

export function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      STORES.forEach((name) => {
        if (!db.objectStoreNames.contains(name)) {
          let store;
          if (name === 'word_progress' || name === 'wrong_word') {
            // 用 word_id 作主键
            store = db.createObjectStore(name, { keyPath: 'word_id' });
          } else if (
            name === 'daily_vocabulary_schedule' ||
            name === 'daily_record' ||
            name === 'quote_cache'
          ) {
            store = db.createObjectStore(name, { keyPath: 'date' });
          } else {
            store = db.createObjectStore(name, { keyPath: 'id', autoIncrement: true });
          }
          // 通用索引
          if (name === 'dictation_attempt') {
            store.createIndex('by_date', 'date', { unique: false });
            store.createIndex('by_word', 'word_id', { unique: false });
          } else if (name === 'task_log') {
            store.createIndex('by_date', 'date', { unique: false });
            store.createIndex('by_task', 'task_id', { unique: false });
          } else if (name === 'focus_session') {
            store.createIndex('by_date', 'date', { unique: false });
          } else if (name === 'coin_ledger') {
            store.createIndex('by_date', 'date', { unique: false });
          } else if (name === 'daily_record') {
            store.createIndex('by_date', 'date', { unique: false });
          } else if (name === 'growth') {
            store.createIndex('by_date', 'date', { unique: false });
          }
        }
      });
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

function tx(stores, mode = 'readonly') {
  return openDB().then((db) => db.transaction(stores, mode));
}

function req2p(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function put(storeName, value) {
  const t = await tx([storeName], 'readwrite');
  const r = req2p(t.objectStore(storeName).put(value));
  await new Promise((res) => { t.oncomplete = res; t.onerror = res; });
  return r;
}

export async function add(storeName, value) {
  const t = await tx([storeName], 'readwrite');
  const r = req2p(t.objectStore(storeName).add(value));
  await new Promise((res) => { t.oncomplete = res; t.onerror = res; });
  return r;
}

export async function get(storeName, key) {
  const t = await tx([storeName]);
  return req2p(t.objectStore(storeName).get(key));
}

export async function del(storeName, key) {
  const t = await tx([storeName], 'readwrite');
  await req2p(t.objectStore(storeName).delete(key));
}

export async function getAll(storeName) {
  const t = await tx([storeName]);
  return req2p(t.objectStore(storeName).getAll());
}

export async function getByIndex(storeName, indexName, value) {
  const t = await tx([storeName]);
  const idx = t.objectStore(storeName).index(indexName);
  return req2p(idx.getAll(value));
}

export async function count(storeName) {
  const t = await tx([storeName]);
  return req2p(t.objectStore(storeName).count());
}

export async function clearStore(storeName) {
  const t = await tx([storeName], 'readwrite');
  await req2p(t.objectStore(storeName).clear());
}

/* ============================================================
   便捷封装：按业务取数据（同时支持 named export 与 Store 对象）
   ============================================================ */

// 词库
export const getWord = (id) => get('ket_vocabulary', id);
export const getAllWords = () => getAll('ket_vocabulary');
export const getProgress = (wordId) => get('word_progress', wordId);
export const getAllProgress = () => getAll('word_progress');
export const putProgress = (p) => put('word_progress', p);

// 每日 schedule
export const getSchedule = (date) => get('daily_vocabulary_schedule', date);
export const putSchedule = (s) => put('daily_vocabulary_schedule', s);

// 听写记录
export const addAttempt = (a) => add('dictation_attempt', a);
export const getAttemptsByDate = (date) => getByIndex('dictation_attempt', 'by_date', date);

// 错词
export const getWrong = (wordId) => get('wrong_word', wordId);
export const getAllWrong = () => getAll('wrong_word');
export const putWrong = (w) => put('wrong_word', w);
export const delWrong = (wordId) => del('wrong_word', wordId);

// 任务配置
export const getAllTaskConfig = () => getAll('task_config');
export const putTaskConfig = (t) => put('task_config', t);

// 任务日志
export const getTaskLog = (id) => get('task_log', id);
export const getTaskLogsByDate = (date) => getByIndex('task_log', 'by_date', date);
export const putTaskLog = (log) => put('task_log', log);
export const getAllTaskLogs = () => getAll('task_log');

// 专注
export const addFocus = (s) => add('focus_session', s);
export const getFocusByDate = (date) => getByIndex('focus_session', 'by_date', date);
export const getAllFocus = () => getAll('focus_session');

// 每日记录
export const getDaily = (date) => get('daily_record', date);
export const putDaily = (r) => put('daily_record', r);
export const getAllDaily = () => getAll('daily_record');

// 金币
export const addCoin = (c) => add('coin_ledger', c);
export const getCoinByDate = (date) => getByIndex('coin_ledger', 'by_date', date);
export const getAllCoin = () => getAll('coin_ledger');

// 成长
export const addGrowth = (g) => add('growth', g);
export const getGrowthByDate = (date) => getByIndex('growth', 'by_date', date);
export const getAllGrowth = () => getAll('growth');

// 设置
export const getSetting = (key) => get('settings', key);
export const putSetting = (s) => put('settings', s);
export const getAllSettings = () => getAll('settings');

// 兼容旧代码：所有方法也挂在 Store 对象上
export const Store = {
  getWord, getAllWords, getProgress, getAllProgress, putProgress,
  getSchedule, putSchedule,
  addAttempt, getAttemptsByDate,
  getWrong, getAllWrong, putWrong, delWrong,
  getAllTaskConfig, putTaskConfig,
  getTaskLog, getTaskLogsByDate, putTaskLog, getAllTaskLogs,
  addFocus, getFocusByDate, getAllFocus,
  getDaily, putDaily, getAllDaily,
  addCoin, getCoinByDate, getAllCoin,
  addGrowth, getGrowthByDate, getAllGrowth,
  getSetting, putSetting, getAllSettings,
};
