/* ============================================================
   bunny.js — 美乐蒂粉兔 SVG（带花）
   主题色：#FF8FB1（主粉）
   ============================================================ */

const PINK = '#FF8FB1';
const PINK_DARK = '#F26B97';
const PINK_LIGHT = '#FFE0EC';
const PINK_PALE = '#FFF0F5';
const WHITE = '#FFFFFF';
const INK = '#4A2A38';
const FLOWER_PINK = '#FFB8C8';
const FLOWER_YELLOW = '#FFD66B';

const id = '[A-Za-z_$][\w$]*';

export function bunny(pose = 'sleep', opts = {}) {
  const ear = renderEars(pose);
  const eye = renderEyes(pose);
  const cheek = renderCheek(pose);
  const mouth = renderMouth(pose);
  const arms = renderArms(pose);
  const item = renderItem(pose, opts);
  const flower = renderFlower();
  return `
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-label="美乐蒂粉兔 ${pose}">
    <defs>
      <radialGradient id="bg-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${PINK_LIGHT}" stop-opacity=".9"/>
        <stop offset="100%" stop-color="${PINK_LIGHT}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="100" cy="100" r="92" fill="url(#bg-glow)"/>
    <!-- 耳朵 -->
    ${ear}
    <!-- 头 -->
    <ellipse cx="100" cy="125" rx="62" ry="58" fill="${PINK}"/>
    <ellipse cx="100" cy="125" rx="58" ry="54" fill="${PINK_LIGHT}"/>
    <!-- 脸颊腮红 -->
    ${cheek}
    <!-- 眼睛 -->
    ${eye}
    <!-- 鼻子嘴 -->
    ${mouth}
    <!-- 身体/手 -->
    ${arms}
    <!-- 道具 -->
    ${item}
    <!-- 头戴花（My Melody 标志性） -->
    ${flower}
  </svg>
  `;
}

function renderEars(pose) {
  const droop = pose === 'sleep' || pose === 'tired';
  const rot1 = droop ? 12 : -8;
  const rot2 = droop ? -12 : 8;
  return `
    <g transform="translate(0 0)">
      <ellipse cx="68" cy="64" rx="14" ry="30" fill="${PINK}" transform="rotate(${rot1} 68 64)"/>
      <ellipse cx="68" cy="64" rx="7" ry="22" fill="${PINK_PALE}" transform="rotate(${rot1} 68 64)"/>
      <ellipse cx="132" cy="64" rx="14" ry="30" fill="${PINK}" transform="rotate(${rot2} 132 64)"/>
      <ellipse cx="132" cy="64" rx="7" ry="22" fill="${PINK_PALE}" transform="rotate(${rot2} 132 64)"/>
    </g>
  `;
}

function renderEyes(pose) {
  if (pose === 'sleep' || pose === 'rest') {
    return `<path d="M76 130 Q86 140 96 130" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
            <path d="M104 130 Q114 140 124 130" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }
  if (pose === 'ok' || pose === 'happy' || pose === 'reading' || pose === 'music' || pose === 'coin' || pose === 'ruler') {
    return `<path d="M76 130 Q86 124 96 130" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
            <path d="M104 130 Q114 124 124 130" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }
  if (pose === 'sad') {
    return `<ellipse cx="86" cy="132" rx="3" ry="4" fill="${INK}"/>
            <ellipse cx="114" cy="132" rx="3" ry="4" fill="${INK}"/>`;
  }
  return `<ellipse cx="86" cy="132" rx="3.5" ry="5" fill="${INK}"/>
          <ellipse cx="114" cy="132" rx="3.5" ry="5" fill="${INK}"/>
          <circle cx="87" cy="130" r="1" fill="#fff"/>
          <circle cx="115" cy="130" r="1" fill="#fff"/>`;
}

function renderCheek(pose) {
  if (pose === 'sad') return '';
  // 腮红：粉嫩色椭圆（My Melody 标志性）
  return `<ellipse cx="68" cy="146" rx="10" ry="6" fill="${FLOWER_PINK}" opacity=".75"/>
          <ellipse cx="132" cy="146" rx="10" ry="6" fill="${FLOWER_PINK}" opacity=".75"/>`;
}

function renderMouth(pose) {
  if (pose === 'sleep' || pose === 'tired') {
    return `<path d="M93 150 Q100 146 107 150" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  }
  if (pose === 'ok' || pose === 'happy' || pose === 'coin' || pose === 'ruler') {
    return `<path d="M90 150 Q100 162 110 150" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  }
  if (pose === 'sad') {
    return `<path d="M92 156 Q100 150 108 156" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  }
  return `<path d="M96 150 Q100 154 104 150" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
}

function renderArms(pose) {
  if (pose === 'coin') {
    return `<ellipse cx="80" cy="184" rx="14" ry="9" fill="${PINK_DARK}"/>
            <ellipse cx="120" cy="184" rx="14" ry="9" fill="${PINK_DARK}"/>
            <circle cx="100" cy="186" r="18" fill="#FFD66B" stroke="#C8A03B" stroke-width="2"/>
            <text x="100" y="192" text-anchor="middle" font-size="16" font-weight="700" fill="#7A5410" font-family="serif">¥</text>`;
  }
  if (pose === 'ruler') {
    return `<ellipse cx="80" cy="184" rx="14" ry="9" fill="${PINK_DARK}"/>
            <ellipse cx="120" cy="184" rx="14" ry="9" fill="${PINK_DARK}"/>
            <rect x="68" y="186" width="64" height="14" rx="2" fill="#FFE6A8" stroke="#C8A03B" stroke-width="1.5" transform="rotate(-8 100 194)"/>
            <g transform="rotate(-8 100 194)" font-size="6" fill="#7A5410">
              <text x="74" y="196">|</text><text x="84" y="196">|</text><text x="94" y="196">|</text><text x="104" y="196">|</text><text x="114" y="196">|</text><text x="124" y="196">|</text>
            </g>`;
  }
  if (pose === 'reading') {
    return `<ellipse cx="80" cy="186" rx="14" ry="9" fill="${PINK_DARK}"/>
            <ellipse cx="120" cy="186" rx="14" ry="9" fill="${PINK_DARK}"/>
            <rect x="60" y="178" width="80" height="20" rx="3" fill="#fff" stroke="${PINK_DARK}" stroke-width="1.5"/>
            <line x1="100" y1="178" x2="100" y2="198" stroke="${PINK_DARK}" stroke-width="1.5"/>
            <line x1="68" y1="186" x2="92" y2="186" stroke="${PINK_DARK}" stroke-width="0.8"/>
            <line x1="68" y1="190" x2="92" y2="190" stroke="${PINK_DARK}" stroke-width="0.8"/>
            <line x1="108" y1="186" x2="132" y2="186" stroke="${PINK_DARK}" stroke-width="0.8"/>
            <line x1="108" y1="190" x2="132" y2="190" stroke="${PINK_DARK}" stroke-width="0.8"/>`;
  }
  if (pose === 'music') {
    return `<ellipse cx="80" cy="186" rx="14" ry="9" fill="${PINK_DARK}"/>
            <ellipse cx="120" cy="186" rx="14" ry="9" fill="${PINK_DARK}"/>
            <path d="M58 80 Q60 60 80 60 L82 90 Q72 95 58 90 Z" fill="${PINK_DARK}"/>
            <path d="M58 80 L60 78" stroke="${PINK_DARK}" stroke-width="2" fill="none"/>
            <path d="M70 70 Q74 66 78 70" stroke="${PINK_DARK}" stroke-width="2" fill="none"/>
            <path d="M140 90 Q144 86 148 90" stroke="${PINK_DARK}" stroke-width="2" fill="none"/>`;
  }
  if (pose === 'ok') {
    return `<ellipse cx="80" cy="186" rx="14" ry="9" fill="${PINK_DARK}"/>
            <ellipse cx="120" cy="184" rx="14" ry="9" fill="${PINK_DARK}"/>
            <path d="M124 180 l8 -8 l4 4 l-12 12 l-8 -4 z" fill="#fff" stroke="${PINK_DARK}" stroke-width="1.5"/>`;
  }
  if (pose === 'write' || pose === 'journal') {
    return `<ellipse cx="80" cy="186" rx="14" ry="9" fill="${PINK_DARK}"/>
            <ellipse cx="120" cy="186" rx="14" ry="9" fill="${PINK_DARK}"/>
            <rect x="70" y="184" width="60" height="14" rx="2" fill="#FFF6E0" stroke="#C8A03B" stroke-width="1.5"/>
            <line x1="76" y1="192" x2="120" y2="192" stroke="#C8A03B" stroke-width="0.8"/>`;
  }
  if (pose === 'sleep') {
    return `<ellipse cx="80" cy="186" rx="14" ry="9" fill="${PINK_DARK}"/>
            <ellipse cx="120" cy="186" rx="14" ry="9" fill="${PINK_DARK}"/>`;
  }
  return `<ellipse cx="80" cy="186" rx="14" ry="9" fill="${PINK_DARK}"/>
          <ellipse cx="120" cy="186" rx="14" ry="9" fill="${PINK_DARK}"/>`;
}

function renderItem(pose) {
  if (pose === 'speaker') {
    return `<g transform="translate(150 96)">
      <path d="M0 0 L18 -14 L18 30 L0 16 Z" fill="${PINK_DARK}"/>
      <rect x="18" y="-6" width="8" height="20" rx="2" fill="${PINK_DARK}"/>
      <path d="M30 -4 Q40 4 30 12" stroke="${PINK_DARK}" stroke-width="2" fill="none"/>
      <path d="M34 -10 Q48 4 34 18" stroke="${PINK_DARK}" stroke-width="2" fill="none"/>
    </g>`;
  }
  return '';
}

/**
 * 头戴花：My Melody 标志性的一朵小花，戴在右耳根部
 * 5 瓣粉色花瓣 + 黄色花心
 */
function renderFlower() {
  // 位置：右耳底部和头之间的位置（约 (140, 78)）
  const cx = 140, cy = 78, r = 9;
  let petals = '';
  for (let i = 0; i < 5; i++) {
    const angle = (i * 72 - 90) * Math.PI / 180;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    petals += `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="7" ry="9" fill="${FLOWER_PINK}" stroke="${PINK_DARK}" stroke-width="0.8" transform="rotate(${(i * 72 - 90).toFixed(0)} ${px.toFixed(1)} ${py.toFixed(1)})"/>`;
  }
  return `
    <g>
      ${petals}
      <circle cx="${cx}" cy="${cy}" r="4.5" fill="${FLOWER_YELLOW}" stroke="#C8A03B" stroke-width="0.6"/>
      <circle cx="${cx - 1.5}" cy="${cy - 1.5}" r="1" fill="#FFE9A0" opacity=".8"/>
    </g>
  `;
}
