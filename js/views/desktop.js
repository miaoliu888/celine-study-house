/* ============================================================
   views/desktop.js — 首页
   ============================================================ */

import { Store } from '../store.js';
import { todayStr, greeting, formatDateZh, QUOTES, render, html, toast } from '../utils.js';
import { bunny } from '../bunny.js';
import { getAllTasks, getTodayLogs, logId, setTaskProgress, toggleTaskComplete, getTodayProgress, checkAndAward } from '../tasks.js';
import { getTodayFocusMinutes } from '../timer.js';
import { getOrCreateDailySchedule } from '../scheduler.js';

async function getSettingsMap() {
  const all = await Store.getAllSettings();
  return Object.fromEntries(all.map((s) => [s.key, s.value]));
}

export async function renderDesktop(root) {
  const date = todayStr();
  const settings = await getSettingsMap();
  const nickname = settings.nickname || 'celine';
  const greet = greeting(nickname);

  // 任务进度
  const prog = await getTodayProgress(date);
  // 今日专注
  const focusMin = await getTodayFocusMinutes(date);
  // 金币余额
  const coins = (await Store.getAllCoin()).reduce(
    (s, c) => s + (c.type === 'earn' ? c.amount : -c.amount),
    0
  );
  // 连续完成天数
  const streak = await calcStreak();
  // 心情
  const daily = (await Store.getDaily(date)) || {};
  // 名言
  const quote = pickQuote(date);

  // KET 词
  let newDone = 0, newTotal = 20, reviewTotal = 0, reviewDone = 0;
  try {
    const sch = await getOrCreateDailySchedule(date);
    newTotal = sch.new_word_ids.length || 20;
    const attempts = await Store.getAttemptsByDate(date);
    newDone = attempts.filter((a) => a.mode === 'new' && a.is_correct).length;
    reviewTotal = sch.review_word_ids.length;
    reviewDone = attempts.filter((a) => a.mode === 'review' && a.is_correct).length;
  } catch (e) {
    // ignore
  }

  // 下一项推荐
  const next = await pickNext(date);

  // 今日奖励
  const rewardToday = daily.reward_earned ? 1 : 0;

  const rate = prog.required ? Math.round((prog.done / prog.required) * 100) : 0;
  const ring = makeRing(rate, prog.done, prog.required);

  const html_ = `
    <div class="col">

      <!-- 问候 -->
      <div class="greet">
        <div class="greet__bunny">${bunny('happy')}</div>
        <div class="greet__body">
          <div class="greet__hello">${greet.text}, ${nickname} ${greet.icon}</div>
          <div class="greet__date">${formatDateZh()}</div>
          <div class="greet__quote">“${quote.en}”<br>${quote.zh}<span class="src">— ${quote.author} · ${quote.src}</span></div>
        </div>
      </div>

      <!-- 接下来 -->
      ${next ? `
        <div class="section">
          <a class="nextup" href="#/${next.href}">
            <div class="nextup__bunny">${bunny(next.pose || 'reading')}</div>
            <div class="nextup__body">
              <div class="nextup__label">接 下 来</div>
              <div class="nextup__title">${next.title}</div>
              <div class="nextup__sub">${next.sub}</div>
            </div>
            <div class="nextup__cta">${next.cta || '开始'} →</div>
          </a>
        </div>
      ` : `
        <div class="section">
          <div class="card" style="background: linear-gradient(135deg, #E1F4EA, #fff); border-color: #B8E5C8;">
            <div class="row" style="gap:12px;">
              <div style="width:60px;height:60px;">${bunny('coin')}</div>
              <div class="grow">
                <div style="font-weight:700;font-size:16px;">今日全部完成 🎉</div>
                <div class="muted tiny">+¥1 已收入小金库</div>
              </div>
            </div>
          </div>
        </div>
      `}

      <!-- 今日进度 + 数据 -->
      <div class="section desk-cols">
        <div class="col">
          <div class="card">
            <div class="card__head">
              <div class="card__title">今日进度</div>
              <div class="card__hint">${date}</div>
            </div>
            <div class="row" style="gap:20px;align-items:center;">
              <div class="ring">${ring}</div>
              <div class="col" style="gap:10px;flex:1;min-width:0;">
                <div>
                  <div class="tiny">今日专注</div>
                  <div style="font-weight:700;font-size:18px;">${focusMin}<span class="muted" style="font-size:12px;"> 分钟</span></div>
                </div>
                <div>
                  <div class="tiny">连续完成</div>
                  <div style="font-weight:700;font-size:18px;">${streak}<span class="muted" style="font-size:12px;"> 天</span></div>
                </div>
                <div>
                  <div class="tiny">今日奖励</div>
                  <div style="font-weight:700;font-size:18px;color:#B07A1F;">¥${rewardToday}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 心情 -->
          <div class="card">
            <div class="card__head">
              <div class="card__title">${nickname}，今天是什么心情？</div>
            </div>
            <div class="mood" id="mood-row">
              ${[
                { v: 5, e: '😄', l: '超开心' },
                { v: 4, e: '🙂', l: '还不错' },
                { v: 3, e: '😐', l: '普通' },
                { v: 2, e: '😟', l: '有点低落' },
                { v: 1, e: '😪', l: '有点累' },
              ].map((m) => `
                <button class="mood__btn ${daily.mood === m.v ? 'selected' : ''}" data-mood="${m.v}">
                  <span class="emoji">${m.e}</span><span class="lbl">${m.l}</span>
                </button>
              `).join('')}
            </div>
            <div style="margin-top:12px;">
              <input class="input" id="mood-note" placeholder="想写一句话（可选）" value="${escapeAttr(daily.mood_note || '')}" />
            </div>
          </div>
        </div>

        <div class="col">
          <!-- KET 单词 -->
          <div class="card" style="background: linear-gradient(135deg, #DCEBFF, #fff); border-color: rgba(143,188,255,.3);">
            <div class="card__head">
              <div class="card__title">KET 每日单词</div>
              <div class="card__hint">${newDone}/${newTotal}</div>
            </div>
            <div class="bar" style="margin: 6px 0 12px;"><div class="bar__fill" style="width:${(newDone / newTotal) * 100 || 0}%"></div></div>
            <div class="row between">
              <div>
                <div class="tiny">错词待复习</div>
                <div style="font-weight:700;font-size:18px;">${reviewDone}/${reviewTotal}</div>
              </div>
              <a class="btn" href="#/dictation">开始听写</a>
            </div>
          </div>

          <!-- 数据 stat -->
          <div class="stat-grid">
            <div class="stat stat--cream">
              <div class="stat__lbl">小金库</div>
              <div class="stat__val">¥${coins}</div>
            </div>
            <div class="stat stat--mint">
              <div class="stat__lbl">今日奖励</div>
              <div class="stat__val">¥${rewardToday}</div>
            </div>
            <div class="stat">
              <div class="stat__lbl">连续天数</div>
              <div class="stat__val">${streak}<span class="unit">天</span></div>
            </div>
            <div class="stat stat--pink">
              <div class="stat__lbl">专注分钟</div>
              <div class="stat__val">${focusMin}<span class="unit">min</span></div>
            </div>
          </div>

          <div class="card">
            <div class="card__head">
              <div class="card__title">今天想记录什么？</div>
            </div>
            <textarea class="textarea" id="day-note" placeholder="比如：今天 because 总是拼错，明天再复习。">${escapeText(daily.summary_text || '')}</textarea>
            <div style="margin-top:10px;display:flex;justify-content:flex-end;">
              <button class="btn btn--sm btn--ghost" data-onclick="saveNote">保存记录</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  root.innerHTML = html_;
  bind(root);

  // 检查发奖（异步，但不在渲染流程里）
  if (prog.done >= prog.required && prog.required > 0 && !daily.reward_earned) {
    checkAndAward(date).then((r) => {
      if (r.awarded) toast('🎉 今日全部完成！+¥1', 'success');
    });
  }
}

function bind(root) {
  // 心情
  root.querySelectorAll('[data-mood]').forEach((b) => {
    b.addEventListener('click', async () => {
      const v = +b.dataset.mood;
      const d = todayStr();
      const old = (await Store.getDaily(d)) || { date: d };
      old.mood = v;
      await Store.putDaily(old);
      root.querySelectorAll('[data-mood]').forEach((x) => x.classList.toggle('selected', +x.dataset.mood === v));
    });
  });
  // 心情备注（输入即存）
  const note = root.querySelector('#mood-note');
  if (note) {
    let t = null;
    note.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        const d = todayStr();
        const old = (await Store.getDaily(d)) || { date: d };
        old.mood_note = note.value;
        await Store.putDaily(old);
      }, 400);
    });
  }
  // 保存今日记录
  const dn = root.querySelector('#day-note');
  const saveBtn = root.querySelector('[data-onclick="saveNote"]');
  if (saveBtn && dn) {
    saveBtn.addEventListener('click', async () => {
      const d = todayStr();
      const old = (await Store.getDaily(d)) || { date: d };
      old.summary_text = dn.value;
      await Store.putDaily(old);
      toast('已保存今日记录 ✨', 'success');
    });
  }
}

async function calcStreak() {
  const logs = await Store.getAllDaily();
  const map = new Map(logs.map((l) => [l.date, l]));
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = todayStr(d);
    const rec = map.get(key);
    if (rec && rec.reward_earned) {
      streak += 1;
      d.setDate(d.getDate() - 1);
    } else {
      if (key === todayStr()) {
        d.setDate(d.getDate() - 1);
        continue;
      }
      break;
    }
    if (streak > 999) break;
  }
  return streak;
}

function pickQuote(date) {
  const idx = hashDate(date) % QUOTES.length;
  return QUOTES[idx];
}

function hashDate(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function makeRing(percent, done, total) {
  const R = 50;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - percent / 100);
  return `
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="${R}" class="ring__bg" stroke-width="12" fill="none"/>
      <circle cx="60" cy="60" r="${R}" class="ring__fg" stroke-width="12" fill="none"
              stroke-dasharray="${C}" stroke-dashoffset="${offset}"/>
    </svg>
    <div class="ring__text">
      <span class="num">${done}/${total}</span>
      <span class="lbl">${percent}%</span>
    </div>
  `;
}

async function pickNext(date) {
  try {
    const sch = await getOrCreateDailySchedule(date);
    const attempts = await Store.getAttemptsByDate(date);
    const newDoneCount = sch.new_word_ids.length === 0
      ? 0
      : attempts.filter((a) => a.mode === 'new' && sch.new_word_ids.includes(a.word_id)).length;
    if (newDoneCount < sch.new_word_ids.length) {
      return {
        title: 'KET 每日听写',
        sub: `今日 ${sch.new_word_ids.length} 词 · 已完成 ${newDoneCount}`,
        cta: '继续听写',
        href: 'dictation',
        pose: 'speaker',
      };
    }
  } catch (e) {}
  const tasks = await getAllTasks();
  const logs = await Store.getTaskLogsByDate(date);
  const logMap = new Map(logs.map((l) => [l.id, l]));
  for (const t of tasks) {
    if (!t.enabled || !t.required) continue;
    if (t.split === 'morning_evening') {
      const am = logMap.get(logId(date, t.id, 'am'));
      const pm = logMap.get(logId(date, t.id, 'pm'));
      if (!(am && am.completed) || !(pm && pm.completed)) {
        return {
          title: t.title,
          sub: `晨读 / 睡前读 · ${(am && am.completed) ? '☀ 已读' : '☀ 待读'} · ${(pm && pm.completed) ? '🌙 已读' : '🌙 待读'}`,
          cta: '去完成',
          href: 'plan',
          pose: 'reading',
        };
      }
    } else {
      const lg = logMap.get(logId(date, t.id, 'single'));
      if (!lg || !lg.completed) {
        return {
          title: t.title,
          sub: `${t.target} ${t.unit} · 今日必做`,
          cta: '去完成',
          href: 'plan',
          pose: 'ruler',
        };
      }
    }
  }
  return null;
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
function escapeText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
