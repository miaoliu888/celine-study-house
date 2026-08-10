/* ============================================================
   views/money.js — 蓝兔小金库
   ============================================================ */

import { Store } from '../store.js';
import { todayStr, render, html, toast, confirmDialog } from '../utils.js';
import { bunny } from '../bunny.js';

export async function renderMoney(root) {
  const all = await Store.getAllCoin();
  const balance = all.reduce((s, c) => s + (c.type === 'earn' ? c.amount : -c.amount), 0);
  const monthKey = todayStr().slice(0, 7);
  const monthEarn = all.filter((c) => c.type === 'earn' && (c.date || '').startsWith(monthKey)).reduce((s, c) => s + c.amount, 0);
  const monthSpend = all.filter((c) => c.type === 'spend' && (c.date || '').startsWith(monthKey)).reduce((s, c) => s + c.amount, 0);

  // 连续完成
  const dailys = await Store.getAllDaily();
  const dMap = new Map(dailys.map((d) => [d.date, d]));
  let streak = 0;
  {
    const d = new Date();
    while (true) {
      const k = todayStr(d);
      const r = dMap.get(k);
      if (r && r.reward_earned) { streak += 1; d.setDate(d.getDate() - 1); }
      else { if (k === todayStr()) { d.setDate(d.getDate() - 1); continue; } break; }
      if (streak > 999) break;
    }
  }

  // 流水
  const ledger = all.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 30);

  // 兑换
  const defaultItems = [
    { name: '一本想看的书', amount: 15 },
    { name: '一套彩色笔', amount: 12 },
    { name: '一个笔记本', amount: 8 },
    { name: '一块橡皮', amount: 3 },
  ];

  root.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">🐰 蓝兔小金库</div>
        <div class="page-subtitle">celine 的每一份坚持都算数</div>
      </div>
    </div>

    <div class="piggy">
      <div class="piggy__bunny">${bunny('coin')}</div>
      <div class="piggy__title">celine 的小金库</div>
      <div class="piggy__amount"><span class="yen">¥</span>${balance}</div>
      <div class="piggy__sub">本月 +¥${monthEarn} · 支出 ¥${monthSpend} · 连续完成 ${streak} 天</div>
    </div>

    <div class="section card">
      <div class="card__head">
        <div class="card__title">记一笔兑换</div>
      </div>
      <div class="col" style="gap:8px;">
        <div class="h-stack">
          ${defaultItems.map((it) => `
            <button class="btn btn--ghost btn--sm" data-spend="${it.amount}" data-item="${escapeHtml(it.name)}">${escapeHtml(it.name)} -¥${it.amount}</button>
          `).join('')}
        </div>
        <div class="row" style="gap:8px;">
          <input class="input" id="custom-item" placeholder="其它（文具 / 玩具…）" />
          <input class="input" id="custom-amt" type="number" min="1" step="1" placeholder="¥" style="width:90px;" />
          <button class="btn" data-act="spend-custom">记录</button>
        </div>
      </div>
    </div>

    <div class="section card">
      <div class="card__head">
        <div class="card__title">流水</div>
        <span class="tiny">最近 30 条</span>
      </div>
      ${ledger.length === 0 ? `<div class="muted">还没有记录</div>` : `
        <div class="ledger">
          ${ledger.map((c) => `
            <div class="ledger__row">
              <div class="ledger__icon">${c.type === 'earn' ? '🐰' : '🎁'}</div>
              <div class="ledger__body">
                <div class="ledger__title">${escapeHtml(c.reason || (c.type === 'earn' ? '奖励' : '兑换'))}</div>
                <div class="ledger__sub">${escapeHtml(c.item || '')} ${c.date || ''}</div>
              </div>
              <div class="ledger__amount ${c.type === 'earn' ? 'plus' : 'minus'}">${c.type === 'earn' ? '+' : '-'}¥${c.amount}</div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;

  // 默认兑换
  root.querySelectorAll('[data-spend]').forEach((b) => {
    b.addEventListener('click', async () => {
      const amount = +b.dataset.spend;
      const item = b.dataset.item;
      const ok = await confirmDialog({ title: `兑换 ${item}？`, desc: `将支出 ¥${amount}。` });
      if (!ok) return;
      await Store.addCoin({ date: todayStr(), type: 'spend', amount, reason: '兑换', item });
      toast('已记录 ✨', 'success');
      renderMoney(root);
    });
  });
  // 自定义
  root.querySelector('[data-act="spend-custom"]')?.addEventListener('click', async () => {
    const item = root.querySelector('#custom-item').value.trim() || '兑换';
    const amount = +root.querySelector('#custom-amt').value;
    if (!amount) { toast('请输入金额', 'warn'); return; }
    const ok = await confirmDialog({ title: `兑换 ${item}？`, desc: `将支出 ¥${amount}。` });
    if (!ok) return;
    await Store.addCoin({ date: todayStr(), type: 'spend', amount, reason: '兑换', item });
    toast('已记录 ✨', 'success');
    renderMoney(root);
  });
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
