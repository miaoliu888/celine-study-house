/* ============================================================
   tts.js — Web Speech API 封装（robust v3, iOS 兼容）
   修复：
   - iOS Safari：必须在用户手势内「同步」调用 speak()，任何 await 都会使
     发音被系统拦截 → 本版在 speak() 前不再 await 任何异步操作。
   - iOS 上「pause()+resume()」会卡死音频（它是 Chrome 桌面端的修复），
     故 iOS 跳过该黑科技。
   - voices 异步加载：同步兜底读取，缺失也不阻塞发音。
   - 全局缓存 TTS 语言，发音前不再读 IndexedDB。
   ============================================================ */

const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

let voicesCache = null;
let preferredVoice = null;
let ready = false;
let initPromise = null;
let primed = false;
let currentLang = 'en-GB';

function safeGetVoices() {
  try { return window.speechSynthesis.getVoices() || []; } catch (e) { return []; }
}

function loadVoices() {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve([]);
    const get = safeGetVoices;
    const v = get();
    if (v && v.length) return resolve(v);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.speechSynthesis.removeEventListener?.('voiceschanged', finish);
      resolve(get());
    };
    window.speechSynthesis.addEventListener?.('voiceschanged', finish);
    setTimeout(finish, 300);
    setTimeout(finish, 1000);
    setTimeout(finish, 2000);
  });
}

async function ensureReady() {
  if (ready) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    voicesCache = await loadVoices();
    const scored = voicesCache
      .filter((v) => v.lang)
      .map((v) => {
        const lang = v.lang.toLowerCase();
        let score = 0;
        if (lang === 'en-gb' || lang.startsWith('en-gb')) score = 100;
        else if (lang.startsWith('en')) score = 50;
        if (/google|microsoft|natural|premium|enhanced|samantha|arthur|daniel|zira|david/i.test(v.name)) score += 10;
        return { v, score };
      })
      .sort((a, b) => b.score - a.score);
    preferredVoice = scored[0]?.v || null;
    ready = true;
  })();
  return initPromise;
}

export function isTTSSupported() {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/** 在入口处预热语音列表（不阻塞） */
export function ensureReadyPrewarm() {
  if (!isTTSSupported()) return;
  if (!ready && !initPromise) ensureReady();
}

/** 设置/读取当前发音语言（避免发音前读 IndexedDB） */
export function setTTSLang(lang) {
  if (lang === 'en-US' || lang === 'en-GB') currentLang = lang;
}
export function getTTSLang() {
  return currentLang;
}

/**
 * iOS / 部分浏览器：在首个用户手势内做一次「静音预热」，解锁 speechSynthesis，
 * 使后续的自动读词（如提交后自动读下一词）也能出声。
 */
export function primeTTS() {
  if (primed || !isTTSSupported()) return;
  primed = true;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    u.rate = 1;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch (e) {
    primed = false;
  }
}

function pickVoice(cache, wantLang) {
  if (!cache || !cache.length) return null;
  return (
    cache.find((v) => v.lang && v.lang.toLowerCase() === wantLang.toLowerCase()) ||
    preferredVoice ||
    null
  );
}

/**
 * speakWord({ word, lang, rate })
 *   - 同步触发 speak()，保证在用户手势窗口内执行（iOS 关键）
 *   - lang 省略时使用全局 currentLang
 *   - rate: 'normal' | 'slow' | <number 0..2>
 */
export function speakWord({ word, lang, rate = 'normal' } = {}) {
  if (!word) return Promise.resolve();
  if (!isTTSSupported()) return Promise.reject(new Error('当前浏览器不支持语音合成'));

  const wantLang = (lang === 'en-US' ? 'en-US' : lang === 'en-GB' ? 'en-GB' : null) || currentLang || 'en-GB';
  const cache = (voicesCache && voicesCache.length) ? voicesCache : safeGetVoices();
  const v = pickVoice(cache, wantLang);
  let r = 0.85;
  if (rate === 'slow') r = 0.6;
  else if (typeof rate === 'number') r = rate;

  // 后台继续预热 preferred voice（不阻塞本次发音）
  if (!ready) ensureReady();

  return new Promise((resolve) => {
    let settled = false;
    const done = () => { if (!settled) { settled = true; resolve(); } };

    const utter = (word, rate) => {
      const u = new SpeechSynthesisUtterance(word);
      u.lang = wantLang;
      if (v) u.voice = v;
      u.rate = rate;
      u.pitch = 1;
      u.volume = 1;
      return u;
    };

    const u = utter(word, r);
    u.onend = done;
    u.onerror = () => done();

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(u); // ← 同步触发，关键
      if (!IS_IOS) {
        // Chrome 桌面端静音修复：暂停再恢复，强制音频输出
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    } catch (e) {
      done();
      return;
    }

    // 兜底：若 onend 异常快地触发（<200ms，疑似静音失败），重试一次
    setTimeout(() => {
      if (settled) return;
      const u2 = utter(word, r);
      u2.onend = done;
      u2.onerror = () => done();
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(u2);
        if (!IS_IOS) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      } catch (e) {
        done();
      }
    }, 260);
  });
}

export function getVoiceInfo() {
  const cache = (voicesCache && voicesCache.length) ? voicesCache : safeGetVoices();
  if (!isTTSSupported()) return { supported: false, count: 0, hasGB: false, hasUS: false };
  return {
    supported: true,
    count: cache.length,
    hasGB: cache.some((v) => v.lang?.toLowerCase().startsWith('en-gb')),
    hasUS: cache.some((v) => v.lang?.toLowerCase().startsWith('en-us')),
    preferred: preferredVoice?.name,
  };
}
