/* ============================================================
   views/vocab.js — 我的词库
   ============================================================ */

import { Store } from '../store.js';
import { render, html, toast } from '../utils.js';
import { bunny } from '../bunny.js';
import { speakWord } from '../tts.js';
import { KET_TOPICS } from '../ket-db.js';

let filter = 'all'; // all | unlearned | learned | wrong | mastered
let topic = 'all';

export async function renderVocab(root) {
  const all = await Store.getAllWords();
  const progress = await Store.getAllProgress();
  const wrong = await Store.getAllWrong();
  const progMap = new Map(progress.map((p) => [p.word_id, p]));
  const wrongMap = new Map(wrong.map((w) => [w.word_id, w]));

  const enriched = all.map((w) => ({
    ...w,
    progress: progMap.get(w.id) || null,
    wrong: wrongMap.get(w.id) || null,
  }));

  let list = enriched;
  if (filter === 'unlearned') list = list.filter((w) => !w.progress);
  if (filter === 'learned') list = list.filter((w) => w.progress);
  if (filter === 'wrong') list = list.filter((w) => w.wrong);
  if (filter === 'mastered') list = list.filter((w) => w.progress && w.progress.mastery >= 2);
  if (topic !== 'all') list = list.filter((w) => w.topic === topic);

  list.sort((a, b) => {
    if (a.progress && b.progress) {
      return (b.progress.last_seen_date || '').localeCompare(a.progress.last_seen_date || '');
    }
    if (a.progress) return -1;
    if (b.progress) return 1;
    return a.word.localeCompare(b.word);
  });

  root.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">📚 我的词库</div>
        <div class="page-subtitle">已学 ${progress.length} / ${all.length} · 错词 ${wrong.length}</div>
      </div>
    </div>
    <div class="vocab-tabs">
      <button class="${filter === 'all' ? 'on' : ''}" data-filter="all">全部</button>
      <button class="${filter === 'unlearned' ? 'on' : ''}" data-filter="unlearned">未学习</button>
      <button class="${filter === 'learned' ? 'on' : ''}" data-filter="learned">已学习</button>
      <button class="${filter === 'wrong' ? 'on' : ''}" data-filter="wrong">错词</button>
      <button class="${filter === 'mastered' ? 'on' : ''}" data-filter="mastered">已掌握</button>
    </div>
    <div class="vocab-filter">
      <button class="${topic === 'all' ? 'on' : ''}" data-topic="all">全部主题</button>
      ${KET_TOPICS.map((t) => `<button class="${topic === t ? 'on' : ''}" data-topic="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('')}
    </div>
    <div class="word-grid">
      ${list.length === 0 ? `
        <div class="card card--ghost" style="text-align:center;padding:24px 12px;grid-column:1/-1;">
          <div class="muted">没有匹配的单词</div>
        </div>
      ` : list.slice(0, 200).map(renderCard).join('')}
    </div>
    ${list.length > 200 ? `<div class="tiny muted" style="text-align:center;margin-top:12px;">共 ${list.length} 词，仅显示前 200 个</div>` : ''}
  `;

  root.querySelectorAll('[data-filter]').forEach((b) => {
    b.addEventListener('click', () => { filter = b.dataset.filter; renderVocab(root); });
  });
  root.querySelectorAll('[data-topic]').forEach((b) => {
    b.addEventListener('click', () => { topic = b.dataset.topic; renderVocab(root); });
  });
  root.querySelectorAll('[data-speak]').forEach((b) => {
    b.addEventListener('click', async () => {
      const all = await Store.getAllSettings();
      const langSet = all.find((s) => s.key === 'tts_lang')?.value || 'en-GB';
      await speakWord({ word: b.dataset.speak, lang: langSet });
    });
  });
}

function renderCard(w) {
  const mastery = w.progress?.mastery || 0;
  const masteryLbl = mastery >= 2 ? '已掌握' : mastery >= 1 ? '基本掌握' : w.progress ? '学习中' : '未学';
  const tagColor = mastery >= 2 ? 'mint' : mastery >= 1 ? 'cream' : w.progress ? 'lilac' : '';
  return `
    <div class="word-card">
      <div class="word-card__head">
        <div class="word-card__word">${escapeHtml(w.word)}</div>
        <div class="word-card__pos">${escapeHtml(w.pos || '')}</div>
        <button class="word-card__speak" data-speak="${escapeHtml(w.word)}" aria-label="发音">🔊</button>
      </div>
      <div class="word-card__meaning">${escapeHtml(w.meaning_zh || '')}</div>
      <div class="word-card__meta">
        <span class="tag ${tagColor}">${masteryLbl}</span>
        <span>${escapeHtml(w.topic || '')}</span>
        ${w.progress ? `<span>· 学 ${w.progress.correct_count || 0} / 错 ${w.progress.wrong_count || 0}</span>` : ''}
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
