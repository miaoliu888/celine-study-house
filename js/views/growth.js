/* ============================================================
   views/growth.js — 成长（身高）
   ============================================================ */

import { Store } from '../store.js';
import { todayStr, render, html, toast } from '../utils.js';
import { bunny } from '../bunny.js';

export async function renderGrowth(root) {
  const list = await Store.getAllGrowth();
  list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const latest = list[list.length - 1] || null;
  const prev = list.length >= 2 ? list[list.length - 2] : null;
  const diff = latest && prev ? (latest.height_cm - prev.height_cm) : 0;

  root.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">📏 celine 长高了吗？</div>
        <div class="page-subtitle">记录身高，看趋势</div>
      </div>
    </div>

    <div class="growth-latest">
      <div style="width:64px;flex-shrink:0;">${bunny('ruler')}</div>
      <div class="grow">
        ${latest ? `
          <div class="growth-latest__val">${latest.height_cm.toFixed(1)}<span class="growth-latest__unit">cm</span></div>
          <div class="growth-latest__diff">${prev ? `+${diff.toFixed(1)}cm · 上次 ${prev.height_cm.toFixed(1)}cm` : '记录第一条身高'}</div>
        ` : `
          <div class="growth-latest__val">—</div>
          <div class="growth-latest__diff">还没有记录</div>
        `}
      </div>
    </div>

    <div class="section card">
      <div class="card__head">
        <div class="card__title">记录身高</div>
      </div>
      <div class="growth-form">
        <input class="input" type="date" id="g-date" value="${todayStr()}" />
        <input class="input" type="number" id="g-val" step="0.1" min="50" max="220" placeholder="身高 cm" />
        <button class="btn" data-act="add">添加</button>
      </div>
    </div>

    ${list.length ? `
      <div class="section card">
        <div class="card__head">
          <div class="card__title">身高趋势</div>
        </div>
        <div class="chart">${renderChart(list)}</div>
        <div class="col" style="gap:4px;margin-top:12px;">
          ${list.slice(-8).reverse().map((g) => `
            <div class="row" style="font-size:13px;color:var(--c-ink-500);">
              <span style="width:90px;">${g.date}</span>
              <span class="grow"></span>
              <span style="font-weight:600;color:var(--c-ink-700);">${g.height_cm.toFixed(1)} cm</span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;

  root.querySelector('[data-act="add"]')?.addEventListener('click', async () => {
    const d = root.querySelector('#g-date').value;
    const v = parseFloat(root.querySelector('#g-val').value);
    if (!d || !v) { toast('请选择日期并填写身高', 'warn'); return; }
    await Store.addGrowth({ date: d, height_cm: v, note: '' });
    toast('已记录 ✨', 'success');
    renderGrowth(root);
  });
}

function renderChart(list) {
  const W = 600, H = 180, P = 24;
  if (list.length < 2) {
    return `<div class="muted" style="text-align:center;line-height:160px;">记录 2 次以上自动生成趋势</div>`;
  }
  const min = Math.min(...list.map((g) => g.height_cm)) - 1;
  const max = Math.max(...list.map((g) => g.height_cm)) + 1;
  const stepX = (W - P * 2) / (list.length - 1);
  const points = list.map((g, i) => {
    const x = P + i * stepX;
    const y = H - P - ((g.height_cm - min) / (max - min)) * (H - P * 2);
    return [x, y, g];
  });
  const pathD = points.map((p, i) => (i === 0 ? `M${p[0]} ${p[1]}` : `L${p[0]} ${p[1]}`)).join(' ');
  return `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      ${[0, 1, 2, 3].map((i) => `<line x1="${P}" y1="${P + i * (H - P * 2) / 3}" x2="${W - P}" y2="${P + i * (H - P * 2) / 3}" stroke="#E2E6F1" stroke-dasharray="2 3"/>`).join('')}
      <path d="${pathD}" fill="none" stroke="#4EC7A8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${points.map(([x, y, g]) => `
        <circle cx="${x}" cy="${y}" r="3.5" fill="#fff" stroke="#4EC7A8" stroke-width="2"/>
        <text x="${x}" y="${y - 8}" font-size="10" text-anchor="middle" fill="#2D7A56" font-weight="600">${g.height_cm.toFixed(1)}</text>
      `).join('')}
    </svg>
  `;
}
