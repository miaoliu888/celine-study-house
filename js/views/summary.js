/* ============================================================
   views/summary.js — 今日总结
   ============================================================ */

import { Store } from '../store.js';
import { todayStr, render, html, toast, SUBJECT_META } from '../utils.js';
import { bunny } from '../bunny.js';
import { getAllTasks, getTodayProgress, getTodayLogs, logId } from '../tasks.js';
import { getTodayFocusMinutes } from '../timer.js';

export async function renderSummary(root) {
  const date = todayStr();
  const prog = await getTodayProgress(date);
  const tasks = (await getAllTasks()).filter((t) => t.enabled);
  const logs = await getTodayLogs(date);
  const logMap = new Map(logs.map((l) => [l.id, l]));
  const focusMin = await getTodayFocusMinutes(date);
  const daily = (await Store.getDaily(date)) || {};
  const settings = await Store.getAllSettings();
  const nickname = settings.find((s) => s.key === 'nickname')?.value || 'celine';

  // 按学科
  const bySub = { chinese: { done: 0, total: 0 }, english: { done: 0, total: 0 }, math: { done: 0, total: 0 } };
  for (const t of tasks) {
    if (!t.required) continue;
    if (t.split === 'morning_evening') {
      bySub[t.subject].total += 2;
      const am = logMap.get(logId(date, t.id, 'am'));
      const pm = logMap.get(logId(date, t.id, 'pm'));
      if (am && am.completed) bySub[t.subject].done += 1;
      if (pm && pm.completed) bySub[t.subject].done += 1;
    } else {
      bySub[t.subject].total += 1;
      const lg = logMap.get(logId(date, t.id, 'single'));
      if (lg && lg.completed) bySub[t.subject].done += 1;
    }
  }

  // KET
  const sch = await Store.getSchedule(date);
  let ketTotal = 0, ketCorrect = 0, ketWrong = 0, reviewTotal = 0, reviewCorrect = 0;
  if (sch) {
    ketTotal = sch.new_word_ids.length;
    reviewTotal = sch.review_word_ids.length;
    const atts = await Store.getAttemptsByDate(date);
    ketCorrect = atts.filter((a) => a.mode === 'new' && a.is_correct).length;
    ketWrong = atts.filter((a) => a.mode === 'new' && !a.is_correct).length;
    reviewCorrect = atts.filter((a) => a.mode === 'review' && a.is_correct).length;
  }
  const ketRate = ketTotal ? Math.round((ketCorrect / ketTotal) * 100) : 0;

  const achv = generateAchv({ prog, focusMin, ketTotal, ketCorrect, ketRate, bySub });

  root.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">📊 今日总结</div>
        <div class="page-subtitle">${date}</div>
      </div>
    </div>

    <div class="card" style="text-align:center;padding:24px 16px;background:linear-gradient(135deg,#E1F4EA,#fff);border-color:rgba(184,229,200,.5);">
      <div style="width:88px;margin:0 auto 8px;">${bunny(prog.done >= prog.required ? 'coin' : 'happy')}</div>
      <div style="font-size:14px;color:var(--c-ink-500);">完成率</div>
      <div style="font-size:42px;font-weight:700;color:#2D7A56;line-height:1.1;font-family:var(--ff-display);">
        ${prog.required ? Math.round((prog.done / prog.required) * 100) : 0}<span style="font-size:18px;">%</span>
      </div>
      <div class="tiny muted" style="margin-top:4px;">${prog.done} / ${prog.required} 个必做任务</div>
    </div>

    <div class="section">
      <div class="card__title" style="margin-bottom:10px;">各学科</div>
      <div class="card">
        ${Object.entries(bySub).map(([k, v]) => `
          <div class="subj-row">
            <div class="subj-row__name subject--${k}"><span class="subject__dot"></span>${SUBJECT_META[k]?.name || k}</div>
            <div class="subj-row__bar">
              <div class="bar bar--${SUBJECT_META[k]?.color || ''}">
                <div class="bar__fill" style="width:${v.total ? (v.done / v.total * 100) : 0}%"></div>
              </div>
            </div>
            <div class="subj-row__val">${v.done} / ${v.total}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="section">
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-card__lbl">KET 新词</div>
          <div class="summary-card__val">${ketCorrect} / ${ketTotal}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card__lbl">KET 正确率</div>
          <div class="summary-card__val" style="color:${ketRate >= 80 ? '#2D7A56' : ketRate >= 60 ? '#B07A1F' : '#C25C77'};">${ketRate}%</div>
        </div>
        <div class="summary-card">
          <div class="summary-card__lbl">错词复习</div>
          <div class="summary-card__val">${reviewCorrect} / ${reviewTotal}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card__lbl">KET 错词</div>
          <div class="summary-card__val">${ketWrong}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card__lbl">今日专注</div>
          <div class="summary-card__val">${focusMin}<span style="font-size:12px;color:var(--c-ink-500);"> min</span></div>
        </div>
        <div class="summary-card">
          <div class="summary-card__lbl">今日奖励</div>
          <div class="summary-card__val" style="color:#B07A1F;">¥${daily.reward_earned ? 1 : 0}</div>
        </div>
      </div>
    </div>

    ${achv.length ? `
      <div class="section">
        <div class="card__title" style="margin-bottom:10px;">今日小成就 ✨</div>
        <div class="col" style="gap:8px;">
          ${achv.map((a) => `
            <div class="achv">
              <div class="achv__icon">${a.icon}</div>
              <div class="achv__text">${a.text}</div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <div class="section card">
      <div class="card__head">
        <div class="card__title">${nickname}，今天想记录什么？</div>
      </div>
      <textarea class="textarea" id="sum-note" placeholder="比如：今天 because 总是拼错，明天再复习。">${daily.summary_text || ''}</textarea>
      <div style="display:flex;justify-content:flex-end;margin-top:10px;">
        <button class="btn btn--sm btn--ghost" data-act="save-sum">保存记录</button>
      </div>
    </div>
  `;

  // 绑定
  root.querySelector('[data-act="save-sum"]')?.addEventListener('click', async () => {
    const v = root.querySelector('#sum-note').value;
    const old = (await Store.getDaily(date)) || { date };
    old.summary_text = v;
    await Store.putDaily(old);
    toast('已保存', 'success');
  });
}

function generateAchv({ prog, focusMin, ketTotal, ketCorrect, ketRate, bySub }) {
  const list = [];
  if (prog.done >= prog.required && prog.required > 0) {
    list.push({ icon: '🏆', text: '今天所有必做任务都完成啦！' });
  }
  if (ketTotal > 0 && ketCorrect >= ketTotal) {
    list.push({ icon: '⭐', text: `KET 听写全对！${ketTotal} 个新词一次过。` });
  } else if (ketTotal > 0) {
    list.push({ icon: '📚', text: `今天完成了 ${ketTotal} 个 KET 新词。` });
  }
  if (ketRate >= 90 && ketTotal > 0) {
    list.push({ icon: '🎯', text: `KET 听写正确率 ${ketRate}%！` });
  }
  if (focusMin >= 60) {
    list.push({ icon: '⏰', text: `今天专注了 ${focusMin} 分钟。` });
  }
  if (bySub.math.done >= bySub.math.total && bySub.math.total > 0) {
    list.push({ icon: '🧮', text: '今天所有数学任务都完成了。' });
  }
  if (bySub.chinese.done >= bySub.chinese.total && bySub.chinese.total > 0) {
    list.push({ icon: '📖', text: '今天所有语文任务都完成了。' });
  }
  return list;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
