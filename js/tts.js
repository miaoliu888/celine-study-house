/* ============================================================
   tts.js — Web Speech API 封装（robust v2）
   修复：
   - Chrome 桌面端静音 bug：speak 后 pause()+resume() 强制出声
   - iOS Safari：首播 / 非手势自动播被拦截 → 首次手势内预热(primeTTS)
   - voices 异步加载为空 → 多次重试兜底，避免静默
   ============================================================ */

let voicesCache = null;
let preferredVoice = null;
let ready = false;
let initPromise = null;
let primed = false;

function loadVoices() {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve([]);
    const get = () => window.speechSynthesis.getVoices() || [];
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
    // 多次重试，覆盖 voices 在不同浏览器下的异步加载时机
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
    // 优先级：en-GB 任意 -> en-US -> 带 Google/Microsoft/Samantha 等优质语音
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

/**
 * iOS / 部分浏览器：在首个用户手势内做一次"静音预热"，
 * 解锁 speechSynthesis，使后续（含非手势的）自动读词也能出声。
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
    primed = false; // 失败则下次手势再试
  }
}

function pickVoice(wantLang) {
  if (!voicesCache || !voicesCache.length) return null;
  return (
    voicesCache.find((v) => v.lang && v.lang.toLowerCase() === wantLang.toLowerCase()) ||
    preferredVoice ||
    null
  );
}

function doSpeak(word, wantLang, rate) {
  return new Promise((resolve) => {
    const build = () => {
      const u = new SpeechSynthesisUtterance(word);
      u.lang = wantLang;
      const v = pickVoice(wantLang);
      if (v) u.voice = v;
      let r = 0.85;
      if (rate === 'slow') r = 0.6;
      else if (typeof rate === 'number') r = rate;
      u.rate = r;
      u.pitch = 1;
      u.volume = 1;
      return u;
    };

    let settled = false;
    const done = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    let u = build();
    u.onend = done;
    u.onerror = () => done();

    try {
      window.speechSynthesis.speak(u);
      // Chrome 静音修复：暂停再恢复，强制音频输出
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    } catch (e) {
      done();
      return;
    }

    // 兜底：若 onend 异常快地触发（<200ms，疑似静音失败），重试一次
    setTimeout(() => {
      if (settled) return;
      const u2 = build();
      u2.onend = done;
      u2.onerror = () => done();
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(u2);
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      } catch (e) {
        done();
      }
    }, 260);
  });
}

/**
 * speakWord({ word, lang = 'en-GB', rate = 'normal' })
 *   rate: 'normal' | 'slow' | <number 0..2>
 */
export async function speakWord({ word, lang = 'en-GB', rate = 'normal' } = {}) {
  if (!word) return;
  if (!isTTSSupported()) {
    throw new Error('当前浏览器不支持语音合成');
  }
  await ensureReady();

  // 停掉上一段，避免叠加；再 resume 复位状态
  try { window.speechSynthesis.cancel(); } catch (e) {}
  try { window.speechSynthesis.resume(); } catch (e) {}

  const wantLang = lang === 'en-US' ? 'en-US' : 'en-GB';
  await doSpeak(word, wantLang, rate);
}

export function getVoiceInfo() {
  if (!voicesCache) return { supported: isTTSSupported(), count: 0, hasGB: false, hasUS: false };
  return {
    supported: true,
    count: voicesCache.length,
    hasGB: voicesCache.some((v) => v.lang?.toLowerCase().startsWith('en-gb')),
    hasUS: voicesCache.some((v) => v.lang?.toLowerCase().startsWith('en-us')),
    preferred: preferredVoice?.name,
  };
}
