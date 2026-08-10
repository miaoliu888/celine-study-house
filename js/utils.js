/* ============================================================
   utils.js — 通用工具
   ============================================================ */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const todayStr = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const parseDate = (str) => {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

export const diffDays = (a, b) => {
  // 返回 b - a 的天数差（自然天）
  const MS = 24 * 3600 * 1000;
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((db - da) / MS);
};

export const pad2 = (n) => String(n).padStart(2, '0');

export const fmtTime = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${pad2(m)}:${pad2(s)}`;
};

export const fmtClock = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${pad2(m)}<span class="tiny">:${pad2(s)}</span>`;
};

export const greeting = (name = 'celine') => {
  const h = new Date().getHours();
  if (h < 5) return { text: `Good night, ${name}`, icon: '🌙' };
  if (h < 11) return { text: `Good morning, ${name}`, icon: '☀️' };
  if (h < 14) return { text: `Good noon, ${name}`, icon: '☀️' };
  if (h < 18) return { text: `Good afternoon, ${name}`, icon: '☁️' };
  if (h < 22) return { text: `Good evening, ${name}`, icon: '🌙' };
  return { text: `Good night, ${name}`, icon: '🌙' };
};

export const formatDateZh = (d = new Date()) => {
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 · ${days[d.getDay()]}`;
};

export const debounce = (fn, ms = 200) => {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const sampleN = (arr, n) => shuffle(arr).slice(0, n);

export const range = (n) => Array.from({ length: n }, (_, i) => i);

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const html = (strings, ...values) => {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) {
      const v = values[i];
      if (v == null || v === false) return;
      if (Array.isArray(v)) { out += v.join(''); return; }
      if (v && typeof v.then === 'function') {
        console.warn('[Siven] html`...` 不支持 await，请把所有 await 移到模板外。');
        return;
      }
      out += String(v);
    }
  });
  return out;
};

/**
 * 渲染：传入一段 HTML 字符串，挂到 root 上（默认替换 innerHTML）
 * 同时为所有带 data-onclick 的元素绑定 click。
 */
export function render(root, htmlStr, handlers = {}) {
  root.innerHTML = htmlStr;
  bindHandlers(root, handlers);
}

export function bindHandlers(root, handlers) {
  Object.entries(handlers).forEach(([key, fn]) => {
    const el = root.querySelector(`[data-onclick="${key}"]`);
    if (el) el.addEventListener('click', fn);
  });
  // 简单的 data-oninput 处理
  Object.entries(handlers).forEach(([key, fn]) => {
    if (!key.startsWith('input:')) return;
    const real = key.slice(6);
    const el = root.querySelector(`[data-oninput="${real}"]`);
    if (el) el.addEventListener('input', fn);
  });
}

// Toast
let toastHost = null;
export function toast(msg, type = '') {
  if (!toastHost) {
    toastHost = document.createElement('div');
    toastHost.className = 'toast-host';
    document.body.appendChild(toastHost);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  toastHost.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    setTimeout(() => el.remove(), 320);
  }, 1800);
}

// Modal
export function confirmDialog({ title, desc, okText = '确定', cancelText = '取消' }) {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    host.className = 'modal-host';
    host.innerHTML = `
      <div class="modal">
        <h3>${title}</h3>
        <p>${desc || ''}</p>
        <div class="modal__actions">
          <button class="btn btn--outline" data-act="cancel">${cancelText}</button>
          <button class="btn" data-act="ok">${okText}</button>
        </div>
      </div>
    `;
    document.body.appendChild(host);
    const close = (v) => { host.remove(); resolve(v); };
    host.addEventListener('click', (e) => {
      if (e.target === host) close(false);
      const a = e.target.closest('[data-act]');
      if (!a) return;
      close(a.dataset.act === 'ok');
    });
  });
}

// 防抖渲染
export const rafDebounce = (fn) => {
  let id = null;
  return (...args) => {
    if (id) cancelAnimationFrame(id);
    id = requestAnimationFrame(() => fn(...args));
  };
};

// 主题名
export const SUBJECT_META = {
  chinese: { name: '语文', color: 'cream' },
  english: { name: '英语', color: 'blue' },
  math:    { name: '数学', color: 'mint' },
};

// 名言库（精选 20 条，可靠来源）
export const QUOTES = [
  { en: 'A reader lives a thousand lives before he dies.', zh: '读书的人，在死之前活了一千种人生。', author: 'George R.R. Martin', src: 'A Dance with Dragons' },
  { en: 'The only way to do great work is to love what you do.', zh: '成就伟业的唯一途径是热爱你所做的事。', author: 'Steve Jobs', src: 'Stanford Commencement Address, 2005' },
  { en: 'It does not matter how slowly you go as long as you do not stop.', zh: '前进慢一点没关系，重要的是不要停下。', author: 'Confucius', src: '《论语》' },
  { en: 'The future belongs to those who believe in the beauty of their dreams.', zh: '未来属于那些相信梦想之美的人。', author: 'Eleanor Roosevelt', src: '演讲' },
  { en: 'Knowledge is power.', zh: '知识就是力量。', author: 'Francis Bacon', src: 'Meditationes Sacrae' },
  { en: '学而时习之，不亦说乎？', zh: '学习并经常温习，不是很愉快吗？', author: '孔子', src: '《论语·学而》' },
  { en: '千里之行，始于足下。', zh: 'A journey of a thousand miles begins with a single step.', author: '老子', src: '《道德经》' },
  { en: 'A book is a dream that you hold in your hand.', zh: '一本书是你握在手中的一个梦。', author: 'Neil Gaiman', src: '演讲' },
  { en: 'You are never too old to set another goal or to dream a new dream.', zh: '你永远不会太老而无法设定新目标或拥有新梦想。', author: 'C.S. Lewis', src: '书信' },
  { en: '宝剑锋从磨砺出，梅花香自苦寒来。', zh: 'A sharp sword is forged by whetting; plum blossoms are fragrant from the bitter cold.', author: '《警世贤文》', src: '古训' },
  { en: 'Practice makes perfect.', zh: '熟能生巧。', author: '英语谚语', src: 'Proverb' },
  { en: 'Where there is a will, there is a way.', zh: '有志者，事竟成。', author: '英语谚语', src: 'Proverb' },
  { en: '不积跬步，无以至千里；不积小流，无以成江海。', zh: 'Without accumulating small steps, one cannot reach a thousand miles.', author: '荀子', src: '《劝学》' },
  { en: 'The beautiful thing about learning is that no one can take it away from you.', zh: '学习之美在于它不会被任何人夺走。', author: 'B.B. King', src: '采访' },
  { en: 'Time and tide wait for no man.', zh: '岁月不待人。', author: '英语谚语', src: 'Proverb' },
  { en: '业精于勤，荒于嬉。', zh: 'Diligence makes one excel; play makes one waste away.', author: '韩愈', src: '《进学解》' },
  { en: 'Genius is one percent inspiration and ninety-nine percent perspiration.', zh: '天才是百分之一的灵感加百分之九十九的汗水。', author: 'Thomas Edison', src: '演讲' },
  { en: 'The more that you read, the more things you will know.', zh: '读得越多，知道的越多。', author: 'Dr. Seuss', src: 'I Can Read with My Eyes Shut' },
  { en: '黑发不知勤学早，白首方悔读书迟。', zh: 'In youth we do not know to study early; in old age we regret it too late.', author: '颜真卿', src: '《劝学》' },
  { en: 'Don\'t watch the clock; do what it does. Keep going.', zh: '不要看着钟，去做它做的事——继续前进。', author: 'Sam Levenson', src: '演讲' },
];
