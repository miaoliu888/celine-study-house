/* ============================================================
   views/settings.js — 设置
   ============================================================ */

import { Store } from '../store.js';
import { todayStr, render, html, toast, confirmDialog } from '../utils.js';
import { bunny } from '../bunny.js';
import { getVoiceInfo, isTTSSupported } from '../tts.js';
import { DEFAULT_TASKS, getAllTasks } from '../tasks.js';

export async function renderSettings(root) {
  const all = await Store.getAllSettings();
  const map = Object.fromEntries(all.map((s) => [s.key, s.value]));
  const nickname = map.nickname || 'celine';
  const reward = map.daily_reward ?? 1;
  const focusMin = map.focus_minutes ?? 20;
  const breakMin = map.break_minutes ?? 5;
  const ttsLang = map.tts_lang || 'en-GB';
  const soundOn = map.sound_on ?? true;
  const quoteOn = map.quote_on ?? true;

  const tasks = await getAllTasks();
  const voice = getVoiceInfo();

  root.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">⚙️ 设置</div>
        <div class="page-subtitle">让 celine 的学习屋更顺手</div>
      </div>
    </div>

    <!-- 个人 -->
    <div class="set-group">
      <div class="set-row">
        <div class="set-row__label">
          <div class="lbl">昵称</div>
          <div class="desc">首页与总结的称呼</div>
        </div>
        <div class="set-row__act">
          <input class="input" id="set-nick" value="${escapeHtml(nickname)}" style="width:140px;height:36px;" />
        </div>
      </div>
    </div>

    <!-- 学习节奏 -->
    <div class="set-group">
      <div class="set-row">
        <div class="set-row__label">
          <div class="lbl">专注时长</div>
          <div class="desc">每轮番茄钟的专注时长（分钟）</div>
        </div>
        <div class="set-row__act">
          <input class="input" id="set-focus" type="number" min="5" max="60" value="${focusMin}" style="width:90px;height:36px;" />
        </div>
      </div>
      <div class="set-row">
        <div class="set-row__label">
          <div class="lbl">休息时长</div>
          <div class="desc">每轮番茄钟结束后的休息时长（分钟）</div>
        </div>
        <div class="set-row__act">
          <input class="input" id="set-break" type="number" min="1" max="30" value="${breakMin}" style="width:90px;height:36px;" />
        </div>
      </div>
      <div class="set-row">
        <div class="set-row__label">
          <div class="lbl">每日奖励</div>
          <div class="desc">完成所有必做任务的奖励金额（¥）</div>
        </div>
        <div class="set-row__act">
          <input class="input" id="set-reward" type="number" min="0" max="20" step="0.5" value="${reward}" style="width:90px;height:36px;" />
        </div>
      </div>
    </div>

    <!-- 发音 -->
    <div class="set-group">
      <div class="set-row">
        <div class="set-row__label">
          <div class="lbl">单词发音</div>
          <div class="desc">${voice.supported ? `${voice.hasGB ? '✓ 英式 en-GB 可用' : '⚠ 未找到 en-GB，将使用 en-US'} · ${voice.hasUS ? '美式 en-US 可用' : ''}` : '当前浏览器不支持语音合成'}</div>
        </div>
        <div class="set-row__act">
          <select class="input" id="set-lang" style="width:140px;height:36px;">
            <option value="en-GB" ${ttsLang === 'en-GB' ? 'selected' : ''}>英式 en-GB</option>
            <option value="en-US" ${ttsLang === 'en-US' ? 'selected' : ''}>美式 en-US</option>
          </select>
        </div>
      </div>
      <div class="set-row">
        <div class="set-row__label">
          <div class="lbl">测试发音</div>
          <div class="desc">点击试听一个单词</div>
        </div>
        <div class="set-row__act">
          <button class="btn btn--ghost btn--sm" data-act="test-tts">🔊 试听 "because"</button>
        </div>
      </div>
    </div>

    <!-- 体验 -->
    <div class="set-group">
      <div class="set-row">
        <div class="set-row__label">
          <div class="lbl">显示每日名言</div>
          <div class="desc">首页顶部展示一句话</div>
        </div>
        <div class="set-row__act">
          <div class="switch ${quoteOn ? 'on' : ''}" data-toggle="quote_on"></div>
        </div>
      </div>
    </div>

    <!-- 任务管理 -->
    <div class="set-group">
      <div class="set-row" style="background:var(--c-blue-50);">
        <div class="set-row__label">
          <div class="lbl">任务清单（${tasks.length}）</div>
          <div class="desc">可以修改名称 / 目标 / 启停</div>
        </div>
        <div class="set-row__act">
          <button class="btn btn--ghost btn--sm" data-act="add-task">+ 新增</button>
        </div>
      </div>
      ${tasks.map(renderTaskRow).join('')}
    </div>

    <!-- 数据 -->
    <div class="set-group">
      <div class="set-row">
        <div class="set-row__label">
          <div class="lbl" style="color:#C25C77;">重置全部数据</div>
          <div class="desc">清空所有任务记录、KET 进度、错词、身高、金币</div>
        </div>
        <div class="set-row__act">
          <button class="btn btn--outline btn--sm" data-act="reset" style="color:#C25C77;border-color:#FFC9D9;">重置</button>
        </div>
      </div>
    </div>
  `;

  // 昵称
  bindInput(root, '#set-nick', 'nickname', (v) => v || 'celine');
  bindInput(root, '#set-focus', 'focus_minutes', (v) => +v || 20);
  bindInput(root, '#set-break', 'break_minutes', (v) => +v || 5);
  bindInput(root, '#set-reward', 'daily_reward', (v) => +v || 1);
  bindSelect(root, '#set-lang', 'tts_lang');

  root.querySelector('[data-act="test-tts"]')?.addEventListener('click', async () => {
    const lang = root.querySelector('#set-lang').value;
    const { speakWord } = await import('../tts.js');
    await speakWord({ word: 'because', lang, rate: 'normal' });
  });

  root.querySelector('[data-toggle="quote_on"]')?.addEventListener('click', async (e) => {
    const cur = !e.currentTarget.classList.contains('on');
    e.currentTarget.classList.toggle('on', cur);
    await Store.putSetting({ key: 'quote_on', value: cur });
  });

  // 任务行
  root.querySelectorAll('[data-edit]').forEach((b) => {
    b.addEventListener('click', () => editTask(b.dataset.edit, root));
  });
  root.querySelectorAll('[data-toggle-task]').forEach((b) => {
    b.addEventListener('click', async () => {
      const id = b.dataset.toggleTask;
      const all = await getAllTasks();
      const t = all.find((x) => x.id === id);
      t.enabled = !t.enabled;
      await Store.putTaskConfig(t);
      renderSettings(root);
    });
  });
  root.querySelectorAll('[data-del-task]').forEach((b) => {
    b.addEventListener('click', async () => {
      const id = b.dataset.delTask;
      const ok = await confirmDialog({ title: '删除这个任务？', desc: '今天的完成记录会保留，但任务本身会被删除。' });
      if (!ok) return;
      // 物理删除
      const { del } = await import('../store.js');
      await del('task_config', id);
      renderSettings(root);
    });
  });

  root.querySelector('[data-act="add-task"]')?.addEventListener('click', () => {
    editTask(null, root);
  });

  root.querySelector('[data-act="reset"]')?.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: '真的要重置所有数据吗？', desc: '将清空任务、错词、KET 进度、身高、金币。无法恢复。' });
    if (!ok) return;
    const { clearStore } = await import('../store.js');
    const stores = ['task_config','task_log','dictation_attempt','wrong_word','word_progress','daily_vocabulary_schedule','focus_session','daily_record','coin_ledger','growth','settings','quote_cache'];
    for (const s of stores) await clearStore(s);
    location.reload();
  });
}

function renderTaskRow(t) {
  return `
    <div class="set-row">
      <div class="set-row__label">
        <div class="lbl">${escapeHtml(t.title)} <span class="tiny muted">${t.target}${t.unit} · ${t.subject}</span></div>
        <div class="desc">${t.required ? '必做' : '选做'} ${t.timer_enabled ? '· 支持番茄' : ''}</div>
      </div>
      <div class="set-row__act row" style="gap:6px;">
        <div class="switch ${t.enabled ? 'on' : ''}" data-toggle-task="${t.id}"></div>
        <button class="btn btn--ghost btn--sm" data-edit="${t.id}">编辑</button>
        <button class="btn btn--outline btn--sm" data-del-task="${t.id}">删除</button>
      </div>
    </div>
  `;
}

async function editTask(id, root) {
  const all = await getAllTasks();
  let t = id ? all.find((x) => x.id === id) : {
    id: 'custom_' + Date.now(),
    subject: 'chinese',
    title: '新任务',
    target: 1,
    unit: '次',
    enabled: true,
    required: true,
    order: 99,
    timer_enabled: true,
    split: 'none',
  };
  if (!t) return;
  // 弹一个简单 modal
  const host = document.createElement('div');
  host.className = 'modal-host';
  host.innerHTML = `
    <div class="modal" style="text-align:left;max-width:480px;">
      <h3>${id ? '编辑任务' : '新增任务'}</h3>
      <div class="col" style="gap:10px;text-align:left;">
        <label class="tiny">名称<input class="input" id="t-title" value="${escapeHtml(t.title)}" /></label>
        <div class="row" style="gap:8px;">
          <label class="tiny" style="flex:1;">目标次数<input class="input" id="t-target" type="number" min="1" value="${t.target}" /></label>
          <label class="tiny" style="flex:1;">单位<input class="input" id="t-unit" value="${escapeHtml(t.unit)}" /></label>
        </div>
        <label class="tiny">学科
          <select class="input" id="t-sub">
            <option value="chinese" ${t.subject==='chinese'?'selected':''}>语文</option>
            <option value="english" ${t.subject==='english'?'selected':''}>英语</option>
            <option value="math" ${t.subject==='math'?'selected':''}>数学</option>
          </select>
        </label>
        <div class="row" style="gap:12px;">
          <label class="row" style="gap:6px;"><input type="checkbox" id="t-req" ${t.required?'checked':''} /> 必做</label>
          <label class="row" style="gap:6px;"><input type="checkbox" id="t-timer" ${t.timer_enabled?'checked':''} /> 支持番茄</label>
          <label class="row" style="gap:6px;"><input type="checkbox" id="t-split" ${t.split==='morning_evening'?'checked':''} /> 分晨/晚</label>
        </div>
      </div>
      <div class="modal__actions" style="margin-top:18px;">
        <button class="btn btn--outline" data-act="cancel">取消</button>
        <button class="btn" data-act="save">保存</button>
      </div>
    </div>
  `;
  document.body.appendChild(host);
  host.addEventListener('click', (e) => {
    if (e.target === host) host.remove();
    if (e.target.closest('[data-act="cancel"]')) host.remove();
    if (e.target.closest('[data-act="save"]')) {
      const newT = {
        ...t,
        title: host.querySelector('#t-title').value.trim() || '未命名',
        target: +host.querySelector('#t-target').value || 1,
        unit: host.querySelector('#t-unit').value.trim() || '次',
        subject: host.querySelector('#t-sub').value,
        required: host.querySelector('#t-req').checked,
        timer_enabled: host.querySelector('#t-timer').checked,
        split: host.querySelector('#t-split').checked ? 'morning_evening' : 'none',
      };
      Store.putTaskConfig(newT).then(() => {
        host.remove();
        renderSettings(root);
        toast('已保存', 'success');
      });
    }
  });
}

function bindInput(root, sel, key, transform) {
  const el = root.querySelector(sel);
  if (!el) return;
  el.addEventListener('change', async () => {
    const v = transform(el.value);
    await Store.putSetting({ key, value: v });
    // 同步更新 nav 头部
    if (key === 'nickname') {
      import('../router.js').then((m) => m.refreshHeaderNickname && m.refreshHeaderNickname(v));
    }
    toast('已保存', 'success');
  });
}
function bindSelect(root, sel, key) {
  const el = root.querySelector(sel);
  if (!el) return;
  el.addEventListener('change', async () => {
    await Store.putSetting({ key, value: el.value });
    toast('已保存', 'success');
  });
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
