/* ============================================================
   main.js — 入口
   ============================================================ */

import { openDB, Store, put } from './store.js';
import { buildKETDatabase } from './ket-db.js';
import { ensureTaskConfig } from './tasks.js';
import { init as routerInit, handleRouteChange, getCurrentRoute } from './router.js';
import { todayStr, toast } from './utils.js';
import { primeTTS } from './tts.js';

// 首次用户手势内预热 speechSynthesis：解锁 iOS Safari 的自动读词
function attachTTSPrime() {
  const prime = () => primeTTS();
  window.addEventListener('pointerdown', prime, { once: true });
  window.addEventListener('keydown', prime, { once: true });
}

// 全局错误捕获：在页面上显示，方便排查
function showFatal(msg) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:20px;z-index:9999;background:#FFF0F3;border:2px solid #FFC9D9;border-radius:12px;padding:20px;font-family:monospace;font-size:13px;line-height:1.6;color:#9B2C3F;overflow:auto;';
  el.innerHTML = `<b>🐰 蓝兔学习屋启动失败：</b><br><pre style="white-space:pre-wrap;margin-top:8px;">${msg.replace(/</g, '&lt;')}</pre>`;
  document.body.appendChild(el);
}

window.addEventListener('error', (e) => {
  console.error('[Siven] error', e.error);
  showFatal(`${e.message}\n\n${(e.error && e.error.stack) || ''}`);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Siven] rejection', e.reason);
  showFatal(`Unhandled Promise Rejection:\n${(e.reason && e.reason.stack) || e.reason}`);
});

async function init() {
  await openDB();
  await ensureKETDatabase();
  await ensureTaskConfig();
  await ensureDefaultSettings();
  attachTTSPrime();
  routerInit();

  // 监听 plan:update 事件，桌面自动刷新进度
  let planUpdateTimer = null;
  window.addEventListener('plan:update', () => {
    clearTimeout(planUpdateTimer);
    planUpdateTimer = setTimeout(() => {
      const { path } = getCurrentRoute();
      if (path === 'desktop') {
        const main = document.getElementById('main');
        if (main) {
          import('./views/desktop.js').then((m) => m.renderDesktop(main));
        }
      }
    }, 400);
  });

  // 简单 console 提示
  console.log('[Siven] 蓝兔学习屋 V1.0 已就绪 ✨');
}

async function ensureKETDatabase() {
  const all = await Store.getAllWords();
  if (all.length > 50) return;
  const words = buildKETDatabase();
  for (const w of words) {
    await put('ket_vocabulary', w);
  }
  console.log('[Siven] KET 词库已初始化：' + words.length + ' 词');
}

async function ensureDefaultSettings() {
  const all = await Store.getAllSettings();
  const have = new Set(all.map((s) => s.key));
  // 迁移：旧版默认昵称 "Siven" 升级为 "celine"
  const oldNick = all.find((s) => s.key === 'nickname');
  if (!oldNick || oldNick.value === 'Siven' || !oldNick.value) {
    await Store.putSetting({ key: 'nickname', value: 'celine' });
  }
  const defaults = [
    { key: 'focus_minutes', value: 20 },
    { key: 'break_minutes', value: 5 },
    { key: 'daily_reward', value: 1 },
    { key: 'tts_lang', value: 'en-GB' },
    { key: 'sound_on', value: true },
    { key: 'quote_on', value: true },
  ];
  for (const d of defaults) {
    if (!have.has(d.key)) await Store.putSetting(d);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
