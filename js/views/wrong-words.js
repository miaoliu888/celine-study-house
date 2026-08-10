/* ============================================================
   views/wrong-words.js — 错词本
   ============================================================ */

import { Store } from '../store.js';
import { todayStr, render, html, toast } from '../utils.js';
import { bunny } from '../bunny.js';
import { speakWord } from '../tts.js';

let filterMode = 'today'; // today | all | mastered

export async function renderWrongWords(root) {
  const date = todayStr();
  const allWords = await Store.getAllWords();
  const wordMap = new Map(allWords.map((w) => [w.id, w]));
  const allWrong = await Store.getAllWrong();

  const todayList = [];
  const allList = [];
  const masteredList = [];
  for (const w of allWrong) {
    const word = wordMap.get(w.word_id);
    if (!word) continue;
    const item = { ...w, word };
    allList.push(item);
    if ((w.last_wrong_date || '') === date) todayList.push(item);
    if ((w.mastery || 0) >= 2) masteredList.push(item);
  }
  allList.sort((a, b) => (b.last_wrong_date || '').localeCompare(a.last_wrong_date || ''));
  todayList.sort((a, b) => (b.last_wrong_date || '').localeCompare(a.last_wrong_date || ''));
  masteredList.sort((a, b) => (b.last_wrong_date || '').localeCompare(a.last_wrong_date || ''));

  const list =
    filterMode === 'today' ? todayList :
    filterMode === 'mastered' ? masteredList :
    allList;

  root.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">📕 错词本</div>
        <div class="page-subtitle">待复习 ${allList.length - masteredList.length} · 已掌握 ${masteredList.length}</div>
      </div>
    </div>
    <div class="wrong-tabs">
      <button class="${filterMode === 'today' ? 'on' : ''}" data-mode="today">今日错词 (${todayList.length})</button>
      <button class="${filterMode === 'all' ? 'on' : ''}" data-mode="all">全部 (${allList.length})</button>
      <button class="${filterMode === 'mastered' ? 'on' : ''}" data-mode="mastered">已掌握 (${masteredList.length})</button>
    </div>

    ${list.length === 0 ? `
      <div class="card card--ghost" style="text-align:center;padding:32px 16px;">
        <div style="width:80px;margin:0 auto;">${bunny('happy')}</div>
        <h3 style="margin:12px 0 4px;">没有错词 🎉</h3>
        <p class="muted">继续保持！</p>
      </div>
    ` : `
      <div class="col" style="gap:8px;">
        ${list.map(renderWrongCard).join('')}
      </div>
    `}
  `;

  root.querySelectorAll('[data-mode]').forEach((b) => {
    b.addEventListener('click', () => {
      filterMode = b.dataset.mode;
      renderWrongWords(root);
    });
  });

  // 发音
  root.querySelectorAll('[data-speak]').forEach((b) => {
    b.addEventListener('click', async () => {
      await speakWord({ word: b.dataset.speak });
    });
  });

  // 单个删除 / 标记掌握
  root.querySelectorAll('[data-del]').forEach((b) => {
    b.addEventListener('click', async () => {
      const id = +b.dataset.del;
      await Store.delWrong(id);
      toast('已移除', 'success');
      renderWrongWords(root);
    });
  });
}

function renderWrongCard(w) {
  const masteryLbl = w.mastery >= 2 ? '已掌握' : w.mastery >= 1 ? '基本掌握' : '待复习';
  const masteryColor = w.mastery >= 2 ? 'mint' : w.mastery >= 1 ? 'cream' : 'pink';
  return `
    <div class="word-card">
      <div class="word-card__head">
        <div class="word-card__word">${escapeHtml(w.word.word)}</div>
        <div class="word-card__pos">${escapeHtml(w.word.pos || '')}</div>
        <button class="word-card__speak" data-speak="${escapeHtml(w.word.word)}" aria-label="发音">🔊</button>
      </div>
      <div class="word-card__meaning">${escapeHtml(w.word.meaning_zh || '')}</div>
      <div class="word-card__meta">
        <span class="tag ${masteryColor}">${masteryLbl}</span>
        <span>错 ${w.wrong_count || 1} 次</span>
        <span>· 最近 ${w.last_wrong_date || '-'}</span>
      </div>
      ${w.last_user_answer ? `<div class="word-card__err">你曾写：${escapeHtml(w.last_user_answer)}</div>` : ''}
      <div class="row" style="gap:6px;margin-top:6px;">
        <button class="btn btn--ghost btn--sm" data-del="${w.word_id}">移除</button>
      </div>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
