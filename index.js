import { eventSource, event_types, saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

const EXT_NAME = 'heartbeat-sync';

const defaultSettings = {
    isEnabled: true,
    score: 42,
    relationType: 'neutral',
    milestones: [
        { id: 'first_contact', name: 'Первый контакт', threshold: 15, done: false },
        { id: 'trust', name: 'Доверие', threshold: 35, done: false },
        { id: 'confession', name: 'Признание', threshold: 60, done: false },
        { id: 'kiss', name: 'Поцелуй', threshold: 75, done: false },
        { id: 'sync', name: 'Полная синхронизация', threshold: 95, done: false },
    ],
    npcs: [],          // { name, score, type }
    widgetPos: null,
    sensorsActive: false,
};

function cfg() {
    if (!extension_settings[EXT_NAME]) {
        extension_settings[EXT_NAME] = structuredClone(defaultSettings);
    }
    // миграция
    const c = extension_settings[EXT_NAME];
    for (const [k, v] of Object.entries(defaultSettings)) {
        if (c[k] === undefined) c[k] = structuredClone(v);
    }
    return c;
}

function save() {
    saveSettingsDebounced();
}

// ===================== СТИЛИ =====================
function injectStyles() {
    if (document.getElementById('hs-styles')) return;
    const el = document.createElement('style');
    el.id = 'hs-styles';
    el.textContent = `
#hs-widget {
    position: fixed;
    bottom: 100px;
    right: 16px;
    width: 92px;
    height: 108px;
    z-index: 999999;
    cursor: grab;
    user-select: none;
    touch-action: none;
    filter: drop-shadow(0 6px 18px rgba(180, 20, 40, 0.35));
    transition: filter 0.3s ease, transform 0.35s ease;
}
#hs-widget:active { cursor: grabbing; }
#hs-widget.hs-flash {
    animation: hs-flash 0.7s ease;
}
@keyframes hs-flash {
    0% { filter: drop-shadow(0 0 4px #ff2a4a) brightness(1); transform: scale(1); }
    35% { filter: drop-shadow(0 0 28px #ff4d6d) brightness(1.6); transform: scale(1.18); }
    100% { filter: drop-shadow(0 6px 18px rgba(180, 20, 40, 0.35)) brightness(1); transform: scale(1); }
}

.hs-heart-svg {
    width: 100%;
    height: 100%;
    overflow: visible;
}
.hs-heart-body {
    transition: fill 0.5s ease, opacity 0.4s ease;
}
.hs-vessels {
    transition: stroke 0.5s ease, opacity 0.4s ease;
}
.hs-glow {
    transition: opacity 0.5s ease;
}

.hs-score-text {
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    font-weight: 700;
    fill: #fff;
    text-shadow: 0 1px 4px rgba(0,0,0,0.7);
    pointer-events: none;
}
.hs-ecg-line {
    fill: none;
    stroke-linecap: round;
    stroke-dasharray: 4 3;
    animation: hs-ecg 1.4s linear infinite;
}
@keyframes hs-ecg {
    to { stroke-dashoffset: -28; }
}

.hs-pulse {
    animation: hs-beat var(--hs-speed, 1.1s) ease-in-out infinite;
    transform-origin: center;
}
@keyframes hs-beat {
    0%, 100% { transform: scale(1); }
    12% { transform: scale(1.07); }
    24% { transform: scale(1); }
    36% { transform: scale(1.04); }
    48% { transform: scale(1); }
}

/* панель */
#hs-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(380px, 94vw);
    max-height: 80vh;
    overflow-y: auto;
    background: rgba(16, 12, 18, 0.92);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 60, 90, 0.25);
    border-radius: 14px;
    z-index: 1000000;
    padding: 16px;
    color: #e8e0e4;
    font-family: system-ui, sans-serif;
    box-shadow: 0 20px 50px rgba(0,0,0,0.55);
    display: none;
}
#hs-panel.open { display: block; }
.hs-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    font-weight: 700;
    font-size: 16px;
    color: #ff6b8a;
}
.hs-close {
    background: none;
    border: none;
    color: #aaa;
    font-size: 20px;
    cursor: pointer;
}
.hs-section {
    margin-bottom: 14px;
}
.hs-section-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    opacity: 0.5;
    margin-bottom: 6px;
}
.hs-btn {
    background: linear-gradient(135deg, #ff4d6d, #c9184a);
    border: none;
    color: white;
    padding: 8px 14px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
    margin-top: 6px;
}
.hs-btn.active {
    background: linear-gradient(135deg, #2a9d8f, #1d6f66);
}
.hs-milestone {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
    font-size: 13px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
}
.hs-milestone.done { opacity: 0.45; text-decoration: line-through; }
.hs-npc-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    padding: 4px 0;
}
.hs-type {
    font-size: 12px;
    opacity: 0.7;
    margin-top: 2px;
}
`;
    document.head.appendChild(el);
}

// ===================== ЦВЕТА ПО SCORE =====================
function getVisualState(score) {
    const s = Math.max(0, Math.min(100, score));
    if (s <= 20) return { hue: 210, sat: 25, light: 35, speed: 1.6, glow: 0.15, label: 'холод' };
    if (s <= 50) return { hue: 0, sat: 55, light: 38, speed: 1.15, glow: 0.35, label: 'тёплый' };
    if (s <= 80) return { hue: 350, sat: 80, light: 48, speed: 0.85, glow: 0.65, label: 'горячий' };
    return { hue: 0, sat: 95, light: 52, speed: 0.55, glow: 0.95, label: 'огонь' };
}

// ===================== SVG СЕРДЦА =====================
function buildHeartSVG(score) {
    const st = getVisualState(score);
    const fill = `hsl(${st.hue}, ${st.sat}%, ${st.light}%)`;
    const vessel = `hsl(${st.hue}, ${Math.min(100, st.sat + 15)}%, ${Math.min(70, st.light + 18)}%)`;
    const glowOp = st.glow;

    return `
<svg class="hs-heart-svg hs-pulse" style="--hs-speed:${st.speed}s" viewBox="0 0 100 115" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="hs-inner-glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <linearGradient id="hs-glass" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.18)"/>
      <stop offset="50%" stop-color="rgba(255,255,255,0.04)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.15)"/>
    </linearGradient>
    <clipPath id="hs-clip">
      <path d="M50 98 C50 98 12 70 12 42 C12 24 26 12 42 12 C48 12 50 16 50 16 C50 16 52 12 58 12 C74 12 88 24 88 42 C88 70 50 98 50 98 Z"/>
    </clipPath>
  </defs>

  <!-- внешнее стекло -->
  <path class="hs-heart-body" d="M50 98 C50 98 12 70 12 42 C12 24 26 12 42 12 C48 12 50 16 50 16 C50 16 52 12 58 12 C74 12 88 24 88 42 C88 70 50 98 50 98 Z"
        fill="rgba(18,10,14,0.75)" stroke="rgba(255,80,110,0.35)" stroke-width="1.8"/>

  <!-- заливка по score -->
  <rect x="0" y="\( {98 - (score / 100) * 86}" width="100" height=" \){(score / 100) * 86}"
        clip-path="url(#hs-clip)" fill="${fill}" opacity="0.82" filter="url(#hs-inner-glow)"/>

  <!-- сосуды -->
  <g class="hs-vessels" fill="none" stroke="${vessel}" stroke-width="1.1" opacity="0.85">
    <path d="M38 38 Q45 48 42 62"/>
    <path d="M62 36 Q55 50 58 64"/>
    <path d="M50 28 Q48 45 50 70"/>
    <path d="M32 52 Q40 58 48 55"/>
    <path d="M68 50 Q60 58 52 56"/>
    <path d="M44 72 Q50 78 56 72"/>
  </g>

  <!-- блик стекла -->
  <path d="M50 98 C50 98 12 70 12 42 C12 24 26 12 42 12 C48 12 50 16 50 16 C50 16 52 12 58 12 C74 12 88 24 88 42 C88 70 50 98 50 98 Z"
        fill="url(#hs-glass)" opacity="0.55"/>

  <!-- ЭКГ внутри -->
  <polyline class="hs-ecg-line" points="22,78 30,78 34,68 38,88 42,78 55,78 59,70 63,86 67,78 78,78"
            stroke="${vessel}" stroke-width="1.3" opacity="0.9"/>

  <!-- процент внутри -->