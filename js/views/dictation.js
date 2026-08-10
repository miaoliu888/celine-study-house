/* ============================================================
   views/dictation.js — 每日 20 词听写
   ============================================================ */

import { Store } from '../store.js';
import { todayStr, render, html, toast, sleep } from '../utils.js';
import { bunny } from '../bunny.js';
import { getOrCreateDailySchedule, markTodayComplete } from '../scheduler.js';
import { submitAttempt, judgeSpelling, diffLetters } from '../review.js';
import { speakWord, isTTSSupported } from '../tts.js';

const STATE = {
  phase: 'ready', // ready | dictating | result | review_result | summary
  list: [],       // { word, mode, idx }
  cursor: 0,
  userInput: '',
  lastResult: null,
  isPlaying: false,
  pace: 'normal',
  accCorrect: 0,
  accWrong: 0,
  reviewCorrect: 0,
  reviewWrong: 0,
  wrongList: [],
  ttsReady: false,
};

export async function renderDictation(root, params = {}) {
  const date = todayStr();
  let schedule;
  try {
    schedule = await getOrCreateDailySchedule(date);
  } catch (e) {
    root.innerHTML = `<div class="card"><div class="card__title">词库未初始化</div><p class="muted">请刷新页面或重新打开 App。</p><p class="muted" style="font-size:12px;">${e.message}</p></div>`;
    return;
  }

  // 准备听写列表（新词 + 复习词）
  const newWords = await getWords(schedule.new_word_ids);
  const reviewWords = await getWords(schedule.review_word_ids);
  STATE.list = [
    ...newWords.map((w) => ({ ...w, mode: 'new' })),
    ...reviewWords.map((w) => ({ ...w, mode: 'review' })),
  ];
  STATE.cursor = 0;
  STATE.accCorrect = 0;
  STATE.accWrong = 0;
  STATE.reviewCorrect = 0;
  STATE.reviewWrong = 0;
  STATE.wrongList = [];
  STATE.phase = STATE.list.length ? 'ready' : 'empty';
  STATE.ttsReady = isTTSSupported();
  STATE.pace = 'normal';

  if (STATE.phase === 'empty') {
    root.innerHTML = `
      <div class="card" style="text-align:center;padding:32px 16px;">
        <div style="width:80px;margin:0 auto;">${bunny('sleep')}</div>
        <h3 style="margin:12px 0 4px;">今天没有听写任务</h3>
        <p class="muted">所有词都学完啦，明天会自动安排新词。</p>
        <div style="margin-top:16px;">
          <a class="btn" href="#/english">返回英语</a>
        </div>
      </div>
    `;
    return;
  }

  // 优先渲染"ready"，用户点开始
  renderReady(root);

  // 绑定开始
  root.querySelector('[data-onclick="start"]')?.addEventListener('click', async () => {
    STATE.phase = 'dictating';
    renderDictating(root);
    bindDictating(root);
    await playCurrent(root);
  });
}

async function getWords(ids) {
  if (!ids || !ids.length) return [];
  const all = await Store.getAllWords();
  const map = new Map(all.map((w) => [w.id, w]));
  return ids.map((id) => map.get(id)).filter(Boolean);
}

function renderReady(root) {
  const total = STATE.list.length;
  const newCount = STATE.list.filter((x) => x.mode === 'new').length;
  const reviewCount = STATE.list.filter((x) => x.mode === 'review').length;
  root.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">✍️ 今日听写</div>
        <div class="page-subtitle">新词 ${newCount} · 复习 ${reviewCount}</div>
      </div>
    </div>
    <div class="card" style="text-align:center;padding:32px 16px;">
      <div style="width:96px;margin:0 auto;">${bunny('speaker')}</div>
      <h3 style="margin:14px 0 6px;">准备好了吗？</h3>
      <p class="muted" style="margin-bottom:18px;">共 ${total} 个单词，听一个写一个。</p>
      <p class="muted tiny" style="margin-bottom:18px;">
        ${STATE.ttsReady ? '🔊 播放单词 · 英式发音优先' : '⚠️ 当前浏览器不支持语音合成'}
      </p>
      <button class="btn btn--lg" data-onclick="start">开始听写</button>
    </div>
  `;
}

function renderDictating(root) {
  const cur = STATE.list[STATE.cursor];
  const total = STATE.list.length;
  const idx = STATE.cursor + 1;
  const percent = (idx / total) * 100;
  const newCount = STATE.list.filter((x) => x.mode === 'new').length;
  const reviewCount = STATE.list.filter((x) => x.mode === 'review').length;
  const reviewDone = Math.min(STATE.cursor, newCount);

  // 答错的字
  const resultHtml = STATE.lastResult
    ? renderLastResult(STATE.lastResult)
    : `
      <div class="tiny muted" style="text-align:center;margin:18px 0 6px;">
        模式：${cur.mode === 'new' ? '新词' : '错词复习'} · 正确 ${STATE.accCorrect + STATE.reviewCorrect} · 错误 ${STATE.accWrong + STATE.reviewWrong}
      </div>
    `;

  root.innerHTML = `
    <div class="dict">
      <div class="dict__progress">
        <span>${idx} / ${total}</span>
        <div class="dict__bar"><div class="bar" style="height:6px;"><div class="bar__fill" style="width:${percent}%"></div></div></div>
        <span>${STATE.accCorrect + STATE.reviewCorrect}✓</span>
      </div>
      <div class="dict__bunny">${bunny(STATE.isPlaying ? 'music' : 'speaker')}</div>
      <div class="dict__bunny-cap">蓝兔陪你听写</div>
      <button class="dict__play" data-act="play" aria-label="播放">🔊</button>
      <div class="dict__controls">
        <button class="btn btn--ghost btn--sm" data-act="slow">🐢 慢一点</button>
        <button class="btn btn--ghost btn--sm" data-act="replay">🔁 再听一次</button>
      </div>
      <div style="margin-top:24px;">
        <input class="input dict__input" id="dict-input" placeholder="输入你听到的单词" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" />
      </div>
      <div style="margin-top:12px;">
        <button class="btn btn--lg btn--block" data-act="submit">确认</button>
      </div>
      ${resultHtml}
    </div>
  `;

  // 自动聚焦
  setTimeout(() => {
    const input = root.querySelector('#dict-input');
    if (input) input.focus();
  }, 50);
}

function renderLastResult(r) {
  if (r.isCorrect) {
    return `
      <div class="dict__result dict__result--ok">
        <div class="verdict ok">✓ 正确</div>
        <div class="dict__meaning"><b>${escapeHtml(r.word.word)}</b> · ${escapeHtml(r.word.meaning_zh || '')}</div>
        <div style="margin-top:10px;display:flex;gap:6px;justify-content:center;">
          <button class="btn btn--ghost btn--sm" data-act="speak-current">🔊 再听一次</button>
        </div>
      </div>
    `;
  } else {
    return `
      <div class="dict__result dict__result--err">
        <div class="verdict err">再记一记</div>
        <div class="dict__diff">${diffLetters(r.word.word, r.userInput)}</div>
        <div class="dict__meaning">正确答案：<b>${escapeHtml(r.word.word)}</b> · ${escapeHtml(r.word.meaning_zh || '')}</div>
        <div class="tiny muted" style="margin-top:6px;">已加入错词本</div>
        <div style="margin-top:10px;display:flex;gap:6px;justify-content:center;">
          <button class="btn btn--ghost btn--sm" data-act="speak-current">🔊 ${escapeHtml(r.word.word)}</button>
        </div>
      </div>
    `;
  }
}

function bindDictating(root) {
  root.querySelector('[data-act="play"]')?.addEventListener('click', () => playCurrent(root));
  root.querySelector('[data-act="slow"]')?.addEventListener('click', async () => {
    STATE.pace = 'slow';
    await playCurrent(root, 'slow');
  });
  root.querySelector('[data-act="replay"]')?.addEventListener('click', () => playCurrent(root));
  root.querySelector('[data-act="speak-current"]')?.addEventListener('click', () => playCurrent(root));
  const input = root.querySelector('#dict-input');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitCurrent(root);
      }
    });
  }
  root.querySelector('[data-act="submit"]')?.addEventListener('click', () => submitCurrent(root));
}

async function playCurrent(root, rate = STATE.pace) {
  if (STATE.isPlaying) return;
  const cur = STATE.list[STATE.cursor];
  if (!cur) return;
  STATE.isPlaying = true;
  const btn = root.querySelector('[data-act="play"]');
  if (btn) btn.classList.add('playing');
  try {
    if (!isTTSSupported()) {
      toast('当前浏览器不支持发音，请到设置里换 Chrome / Edge / Safari。', 'warn');
      return;
    }
    // 读设置里的语言
    const all = await Store.getAllSettings();
    const langSet = all.find((s) => s.key === 'tts_lang')?.value || 'en-GB';
    await speakWord({ word: cur.word, lang: langSet, rate });
  } catch (e) {
    toast('播放失败：' + e.message, 'error');
  } finally {
    STATE.isPlaying = false;
    if (btn) btn.classList.remove('playing');
  }
}

async function submitCurrent(root) {
  const cur = STATE.list[STATE.cursor];
  if (!cur) return;
  const input = root.querySelector('#dict-input');
  const typed = (input?.value || '').trim();
  if (!typed) {
    toast('先输入你听到的单词', 'warn');
    input?.focus();
    return;
  }
  const isCorrect = judgeSpelling(cur.word, typed);
  // 写记录
  await Store.addAttempt({
    date: todayStr(),
    word_id: cur.id,
    typed_answer: typed,
    correct_answer: cur.word,
    is_correct: isCorrect,
    attempt_index: STATE.cursor + 1,
    mode: cur.mode,
  });
  // 更新错词 / 进度
  const r = await submitAttempt(cur.id, cur.mode, isCorrect, typed);

  // 统计
  if (cur.mode === 'new') {
    if (isCorrect) STATE.accCorrect += 1;
    else {
      STATE.accWrong += 1;
      STATE.wrongList.push(cur);
    }
  } else {
    if (isCorrect) STATE.reviewCorrect += 1;
    else {
      STATE.reviewWrong += 1;
      STATE.wrongList.push(cur);
    }
  }

  STATE.lastResult = { isCorrect, userInput: typed, word: cur, mastery: r.mastery };
  // 渲染结果
  renderResult(root);
  bindResult(root);
}

function renderResult(root) {
  const cur = STATE.list[STATE.cursor];
  const total = STATE.list.length;
  const idx = STATE.cursor + 1;
  const percent = (idx / total) * 100;

  root.innerHTML = `
    <div class="dict">
      <div class="dict__progress">
        <span>${idx} / ${total}</span>
        <div class="dict__bar"><div class="bar" style="height:6px;"><div class="bar__fill" style="width:${percent}%"></div></div></div>
        <span>${STATE.accCorrect + STATE.reviewCorrect}✓</span>
      </div>
      <div class="dict__bunny">${bunny(STATE.lastResult.isCorrect ? 'ok' : 'reading')}</div>
      <div class="dict__bunny-cap">${STATE.lastResult.isCorrect ? '太棒了！' : '记住它哦～'}</div>
      ${renderLastResult(STATE.lastResult)}
      <div class="dict__next">
        <button class="btn btn--lg btn--block" data-act="next">下一词 →</button>
      </div>
    </div>
  `;
}

function bindResult(root) {
  root.querySelector('[data-act="next"]')?.addEventListener('click', () => goNext(root));
  root.querySelector('[data-act="speak-current"]')?.addEventListener('click', () => playCurrent(root));
  setTimeout(() => playCurrent(root), 250);
}

async function goNext(root) {
  STATE.cursor += 1;
  if (STATE.cursor >= STATE.list.length) {
    // 完成
    await markTodayComplete(todayStr(), 'new', STATE.accCorrect, STATE.accWrong);
    await markTodayComplete(todayStr(), 'review', STATE.reviewCorrect, STATE.reviewWrong);
    renderSummary(root);
    return;
  }
  STATE.lastResult = null;
  STATE.pace = 'normal';
  renderDictating(root);
  bindDictating(root);
  await playCurrent(root);
}

function renderSummary(root) {
  const total = STATE.list.length;
  const newTotal = STATE.list.filter((x) => x.mode === 'new').length;
  const reviewTotal = STATE.list.filter((x) => x.mode === 'review').length;
  const newScore = STATE.accCorrect;
  const newWrong = STATE.accWrong;
  const revScore = STATE.reviewCorrect;
  const revWrong = STATE.reviewWrong;
  const correct = newScore + revScore;
  const wrong = newWrong + revWrong;
  const rate = total ? Math.round((correct / total) * 100) : 0;

  const wrongWords = STATE.wrongList;

  root.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">今日听写完成 🎉</div>
        <div class="page-subtitle">${total} 个词 · 正确率 ${rate}%</div>
      </div>
    </div>
    <div class="dict-summary">
      <div class="dict-summary__hero">
        <div class="dict-summary__bunny">${bunny('coin')}</div>
        <div class="dict-summary__score">${correct} / ${total}</div>
        <div class="dict-summary__rate">正确率 ${rate}%</div>
        <div class="tiny muted" style="margin-top:6px;">
          新词 ${newScore}/${newTotal} · 复习 ${revScore}/${reviewTotal}
        </div>
      </div>
      ${wrongWords.length ? `
        <div class="card" style="margin-top:18px;">
          <div class="card__head">
            <div class="card__title">错词 (${wrongWords.length})</div>
            <a class="tiny" href="#/wrong-words" data-onclick="goWrong">查看全部 →</a>
          </div>
          <div class="wrong-list">
            ${wrongWords.map((w) => `
              <div class="row-item">
                <div>
                  <div class="word">${escapeHtml(w.word)}</div>
                  <div class="meaning">${escapeHtml(w.meaning_zh || '')}</div>
                </div>
                <button class="speak" data-speak="${escapeHtml(w.word)}" aria-label="发音">🔊</button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : `
        <div class="card" style="margin-top:18px;text-align:center;">
          <div class="muted">今天全部答对啦 ✨</div>
        </div>
      `}
      <div style="margin-top:18px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
        <a class="btn btn--ghost" href="#/wrong-words" data-onclick="goWrong">复习今天错词</a>
        <a class="btn" href="#/desktop" data-onclick="goHome">回首页</a>
      </div>
    </div>
  `;

  // 绑定发音
  root.querySelectorAll('[data-speak]').forEach((b) => {
    b.addEventListener('click', async () => {
      const all = await Store.getAllSettings();
      const langSet = all.find((s) => s.key === 'tts_lang')?.value || 'en-GB';
      await speakWord({ word: b.dataset.speak, lang: langSet });
    });
  });
  // 庆祝
  toast('🎉 听写完成！', 'success');
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
