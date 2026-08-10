/* ============================================================
   router.js — 简易 hash 路由
   ============================================================ */

import { renderDesktop } from './views/desktop.js';
import { renderPlan } from './views/plan.js';
import { renderEnglish } from './views/english.js';
import { renderDictation } from './views/dictation.js';
import { renderWrongWords } from './views/wrong-words.js';
import { renderVocab } from './views/vocab.js';
import { renderEnglishStats } from './views/english-stats.js';
import { renderFocus } from './views/focus.js';
import { renderSummary } from './views/summary.js';
import { renderCalendar } from './views/calendar.js';
import { renderGrowth } from './views/growth.js';
import { renderMoney } from './views/money.js';
import { renderSettings } from './views/settings.js';

import { $, $$ } from './utils.js';
import { Store } from './store.js';
import { bunny } from './bunny.js';

const ROUTES = {
  desktop: { title: '桌面', icon: '🏠', render: renderDesktop, label: '桌面' },
  plan: { title: '今日计划', icon: '✓', render: renderPlan, label: '今日计划' },
  english: { title: 'KET 英语', icon: '🔤', render: renderEnglish, label: 'KET英语' },
  dictation: { title: '今日听写', icon: '✍️', render: renderDictation, label: '今日听写', hidden: true },
  'wrong-words': { title: '错词本', icon: '📕', render: renderWrongWords, label: '错词本', hidden: true },
  vocab: { title: '我的词库', icon: '📚', render: renderVocab, label: '我的词库', hidden: true },
  'english-stats': { title: '学习统计', icon: '📈', render: renderEnglishStats, label: '学习统计', hidden: true },
  focus: { title: '专注', icon: '⏰', render: renderFocus, label: '专注', hidden: true },
  summary: { title: '今日总结', icon: '📊', render: renderSummary, label: '今日总结' },
  calendar: { title: '学习日历', icon: '🗓️', render: renderCalendar, label: '学习日历' },
  growth: { title: '成长', icon: '📏', render: renderGrowth, label: '成长记录' },
  money: { title: '小金库', icon: '🐰', render: renderMoney, label: '蓝兔小金库' },
  settings: { title: '设置', icon: '⚙️', render: renderSettings, label: '设置' },
};

export const NAV_ITEMS = [
  { key: 'desktop', icon: '🏠', label: '桌面' },
  { key: 'plan',    icon: '✓',  label: '计划' },
  { key: 'english', icon: '🔤', label: '英语' },
  { key: 'focus',   icon: '⏰', label: '专注' },
  { key: 'summary', icon: '📊', label: '总结' },
  { key: 'growth',  icon: '📏', label: '成长' },
  { key: 'money',   icon: '🐰', label: '金库' },
  { key: 'settings',icon: '⚙️', label: '设置' },
];

let _onChange = null;

export function getCurrentRoute() {
  const hash = location.hash.replace(/^#\/?/, '') || 'desktop';
  const [path, query] = hash.split('?');
  const params = {};
  if (query) {
    query.split('&').forEach((p) => {
      const [k, v] = p.split('=');
      params[k] = decodeURIComponent(v || '');
    });
  }
  return { path, params };
}

export function navigate(path) {
  if (location.hash === `#/${path}`) {
    // 强制重渲染
    handleRouteChange();
  } else {
    location.hash = `#/${path}`;
  }
}

export function onRouteChange(cb) {
  _onChange = cb;
}

export async function handleRouteChange() {
  const { path, params } = getCurrentRoute();
  const route = ROUTES[path] || ROUTES.desktop;
  const main = $('#main');
  if (!main) return;
  // 标题
  const titleEl = $('#page-title');
  if (titleEl) titleEl.textContent = route.title;

  // 导航高亮
  $$('.nav__item').forEach((el) => {
    el.classList.toggle('active', el.dataset.key === nearestNavKey(path));
  });

  // 渲染
  try {
    await route.render(main, params);
  } catch (e) {
    console.error(e);
    main.innerHTML = `<div class="card"><div class="card__title">出错了</div><p class="muted">${e.message}</p></div>`;
  }
  // 滚动到顶
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (_onChange) _onChange({ path, params });
}

function nearestNavKey(path) {
  // 详情页（dictation/wrong-words 等）→ 关联到主入口
  if (path === 'dictation' || path === 'wrong-words' || path === 'vocab' || path === 'english-stats') return 'english';
  if (path === 'focus') return 'focus';
  if (path === 'settings') return 'settings';
  return path;
}

export async function buildSidebar() {
  const nav = $('#nav-list');
  const footer = $('#nav-footer');
  nav.innerHTML = '';
  NAV_ITEMS.forEach((item) => {
    const a = document.createElement('a');
    a.href = `#/${item.key}`;
    a.className = 'nav__item';
    a.dataset.key = item.key;
    a.innerHTML = `<span class="icon">${item.icon}</span><span class="label">${item.label}</span>`;
    nav.appendChild(a);
  });
  if (footer) {
    footer.innerHTML = `
      <a href="#/settings" class="nav__item" data-key="settings">
        <span class="icon">⚙️</span><span class="label">设置</span>
      </a>
    `;
  }
  // 填头像和昵称
  await fillHeader();
}

let _headerFilled = false;
async function fillHeader() {
  if (_headerFilled) return;
  let nickname = 'celine';
  try {
    const all = await Store.getAllSettings();
    const map = Object.fromEntries(all.map((s) => [s.key, s.value]));
    if (map.nickname) nickname = map.nickname;
  } catch (e) { /* ignore */ }
  const avatar = $('#nav-avatar');
  const name = $('#nav-name');
  if (avatar) avatar.innerHTML = bunny('happy');
  if (name) name.textContent = nickname;
  _headerFilled = true;
}

export function refreshHeaderNickname(nickname) {
  const name = $('#nav-name');
  if (name) name.textContent = nickname || 'celine';
}

export function init() {
  buildSidebar().then(() => {
    window.addEventListener('hashchange', handleRouteChange);
    handleRouteChange();
  });
}
