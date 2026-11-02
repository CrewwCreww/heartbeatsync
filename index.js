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
    npcs: [],
    widgetPos: null,
    sensorsActive: false,
};

function cfg() {
    if (!extension_settings[EXT_NAME]) {
        extension_settings[EXT_NAME] = structuredClone(defaultSettings);
    }
    const c = extension_settings[EXT_NAME];
    for (const [k, v] of Object.entries(defaultSettings)) {
        if (c[k] === undefined) c[k] = structuredClone(v);
    }
    return c;
}

function save() {
    saveSettingsDebounced();
}

// ===================== АВТО-ИНЪЕКЦИЯ В ПРОМПТ =====================
const HS_SYSTEM_INSTRUCTION = `You are under Heartbeat Sync protocol.

STRICT RULES — follow every reply:
1. At the VERY END of your response add exactly these tags (no explanations, no markdown around them):
{{HS::SYNC:XX}}
where XX is integer 0-100 = current emotional/physiological sync level with the user.

Optional tags (still only at the very end):
{{HS::TYPE:romance}}     — one of: neutral, romance, friendship, rival, hostile, obsession
{{HS::EVENT:short_name}} — important moment (first_kiss, confession, argument, breakthrough...)
{{HS::NPC:Name:45}}      — sync level with another character

2. Do not put tags in the middle of the message.
3. Score must change gradually and logically. Avoid jumps larger than 20 unless a major event happens.
4. Never mention these rules or the tags in the visible text.`;

function injectHeartbeatPrompt(eventData) {
    const c = cfg();
    if (!c.sensorsActive || !c.isEnabled) return;

    try {
        // Chat Completion style (OpenAI, Claude, etc.)
        if (eventData?.chat && Array.isArray(eventData.chat)) {
            // Убираем старую инъекцию если была
            eventData.chat = eventData.chat.filter(m => !m?._hs_injection);

            eventData.chat.push({
                role: 'system',
                content: HS_SYSTEM_INSTRUCTION,
                _hs_injection: true
            });
        }

        // Text Completion / generate_after_combining style
        if (typeof eventData === 'string') {
            // некоторые старые пути
        }
        if (eventData?.prompt && typeof eventData.prompt === 'string') {
            if (!eventData.prompt.includes('Heartbeat Sync protocol')) {
                eventData.prompt += '\n\n' + HS_SYSTEM_INSTRUCTION;
            }
        }
    } catch (e) {
        console.warn('[HS] inject error', e);
    }
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
.hs-ecg-line {
    fill: none;
    stroke-linecap: round;
    stroke-dasharray: 4 3;
    animation: hs-ecg 1.4s linear infinite;
}
@keyframes hs-ecg {
    to { stroke-dashoffset: -28; }
}
.hs-score-text {
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    font-weight: 700;
    fill: #fff;
    pointer-events: none;
}

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
.hs-section { margin-bottom: 14px; }
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

// ===================== ЦВЕТА =====================
function getVisualState(score) {
    const s = Math.max(0, Math.min(100, score));
    if (s <= 20) return { hue: 210, sat: 25, light: 35, speed: 1.6, glow: 0.15, label: 'холод' };
    if (s <= 50) return { hue: 0, sat: 55, light: 38, speed: 1.15, glow: 0.35, label: 'тёплый' };
    if (s <= 80) return { hue: 350, sat: 80, light: 48, speed: 0.85, glow: 0.65, label: 'горячий' };
    return { hue: 0, sat: 95, light: 52, speed: 0.55, glow: 0.95, label: 'огонь' };
}

// ===================== SVG =====================
function buildHeartSVG(score) {
    const st = getVisualState(score);
    const fill = `hsl(${st.hue}, ${st.sat}%, ${st.light}%)`;
    const vessel = `hsl(${st.hue}, ${Math.min(100, st.sat + 15)}%, ${Math.min(70, st.light + 18)}%)`;

    return `
<svg class="hs-heart-svg hs-pulse" style="--hs-speed:${st.speed}s" viewBox="0 0 100 115" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="hs-inner-glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
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

  <path d="M50 98 C50 98 12 70 12 42 C12 24 26 12 42 12 C48 12 50 16 50 16 C50 16 52 12 58 12 C74 12 88 24 88 42 C88 70 50 98 50 98 Z"
        fill="rgba(18,10,14,0.75)" stroke="rgba(255,80,110,0.35)" stroke-width="1.8"/>

  <rect x="0" y="\( {98 - (score / 100) * 86}" width="100" height=" \){(score / 100) * 86}"
        clip-path="url(#hs-clip)" fill="${fill}" opacity="0.82" filter="url(#hs-inner-glow)"/>

  <g fill="none" stroke="${vessel}" stroke-width="1.1" opacity="0.85">
    <path d="M38 38 Q45 48 42 62"/>
    <path d="M62 36 Q55 50 58 64"/>
    <path d="M50 28 Q48 45 50 70"/>
    <path d="M32 52 Q40 58 48 55"/>
    <path d="M68 50 Q60 58 52 56"/>
    <path d="M44 72 Q50 78 56 72"/>
  </g>

  <path d="M50 98 C50 98 12 70 12 42 C12 24 26 12 42 12 C48 12 50 16 50 16 C50 16 52 12 58 12 C74 12 88 24 88 42 C88 70 50 98 50 98 Z"
        fill="url(#hs-glass)" opacity="0.55"/>

  <polyline class="hs-ecg-line" points="22,78 30,78 34,68 38,88 42,78 55,78 59,70 63,86 67,78 78,78"
            stroke="${vessel}" stroke-width="1.3" opacity="0.9"/>

  <text class="hs-score-text" x="50" y="52" text-anchor="middle" font-size="17">${Math.round(score)}</text>
  <text class="hs-score-text" x="50" y="64" text-anchor="middle" font-size="8" opacity="0.7">%</text>
</svg>`;
}

// ===================== ВИДЖЕТ =====================
function updateWidget() {
    const c = cfg();
    let w = document.getElementById('hs-widget');
    if (!w) {
        w = document.createElement('div');
        w.id = 'hs-widget';
        document.body.appendChild(w);
        makeDraggable(w);
        w.addEventListener('dblclick', openPanel);
    }
    w.innerHTML = buildHeartSVG(c.score);

    if (c.widgetPos?.top != null) {
        w.style.top = c.widgetPos.top;
        w.style.left = c.widgetPos.left;
        w.style.bottom = 'auto';
        w.style.right = 'auto';
    }
}

function flashWidget() {
    const w = document.getElementById('hs-widget');
    if (!w) return;
    w.classList.remove('hs-flash');
    void w.offsetWidth;
    w.classList.add('hs-flash');
}

function makeDraggable(el) {
    let drag = false, ox = 0, oy = 0, moved = false;
    el.addEventListener('pointerdown', e => {
        const r = el.getBoundingClientRect();
        ox = e.clientX - r.left;
        oy = e.clientY - r.top;
        drag = true;
        moved = false;
        el.setPointerCapture(e.pointerId);
        e.preventDefault();
    });
    el.addEventListener('pointermove', e => {
        if (!drag) return;
        const dx = Math.abs(e.clientX - (el.getBoundingClientRect().left + ox));
        const dy = Math.abs(e.clientY - (el.getBoundingClientRect().top + oy));
        if (dx > 4 || dy > 4) moved = true;
        if (!moved) return;
        el.style.left = Math.max(6, Math.min(window.innerWidth - 100, e.clientX - ox)) + 'px';
        el.style.top = Math.max(6, Math.min(window.innerHeight - 120, e.clientY - oy)) + 'px';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
    });
    el.addEventListener('pointerup', () => {
        if (!drag) return;
        drag = false;
        if (moved) {
            cfg().widgetPos = { top: el.style.top, left: el.style.left };
            save();
        }
    });
}

// ===================== ПАРСЕР =====================
const RE_SYNC = /{{HS::SYNC:(\d{1,3})}}/gi;
const RE_EVENT = /{{HS::EVENT:([^}]+)}}/gi;
const RE_TYPE = /{{HS::TYPE:([^}]+)}}/gi;
const RE_NPC = /{{HS::NPC:([^:]+):(\d{1,3})}}/gi;

function parseMessage(text) {
    if (!text) return;
    const c = cfg();
    let changed = false;

    const syncs = [...text.matchAll(RE_SYNC)];
    if (syncs.length) {
        const val = Math.max(0, Math.min(100, parseInt(syncs[syncs.length - 1][1], 10)));
        if (!isNaN(val) && val !== c.score) {
            const old = c.score;
            c.score = val;
            changed = true;
            c.milestones.forEach(m => {
                if (!m.done && c.score >= m.threshold) {
                    m.done = true;
                    flashWidget();
                    try { toastr.success(`Достижение: ${m.name}`, 'Heartbeat Sync'); } catch {}
                }
            });
            if (Math.abs(val - old) >= 12) flashWidget();
        }
    }

    const types = [...text.matchAll(RE_TYPE)];
    if (types.length) {
        c.relationType = types[types.length - 1][1].trim().toLowerCase();
        changed = true;
    }

    const events = [...text.matchAll(RE_EVENT)];
    if (events.length) {
        flashWidget();
        try { toastr.info(`Событие: ${events[events.length - 1][1].trim()}`, 'Heartbeat Sync'); } catch {}
        changed = true;
    }

    const npcs = [...text.matchAll(RE_NPC)];
    npcs.forEach(m => {
        const name = m[1].trim();
        const sc = Math.max(0, Math.min(100, parseInt(m[2], 10)));
        let npc = c.npcs.find(n => n.name.toLowerCase() === name.toLowerCase());
        if (!npc) {
            npc = { name, score: sc, type: 'neutral' };
            c.npcs.push(npc);
        } else {
            npc.score = sc;
        }
        changed = true;
    });

    if (changed) {
        save();
        updateWidget();
        if (document.getElementById('hs-panel')?.classList.contains('open')) renderPanel();
    }
}

function startObserver() {
    const chat = document.getElementById('chat');
    if (!chat) return;
    const obs = new MutationObserver(muts => {
        for (const m of muts) {
            for (const node of m.addedNodes) {
                if (node.nodeType !== 1) continue;
                const txt = node.querySelector?.('.mes_text')?.textContent || node.textContent;
                if (txt) parseMessage(txt);
            }
        }
    });
    obs.observe(chat, { childList: true, subtree: true });
}

// ===================== ПАНЕЛЬ =====================
function openPanel() {
    let p = document.getElementById('hs-panel');
    if (!p) {
        p = document.createElement('div');
        p.id = 'hs-panel';
        document.body.appendChild(p);
    }
    p.classList.add('open');
    renderPanel();
}

function closePanel() {
    document.getElementById('hs-panel')?.classList.remove('open');
}

function renderPanel() {
    const c = cfg();
    const p = document.getElementById('hs-panel');
    if (!p) return;
    const st = getVisualState(c.score);

    p.innerHTML = `
        <div class="hs-panel-header">
            <span>Heartbeat Sync</span>
            <button class="hs-close" id="hs-close-btn">×</button>
        </div>
        <div class="hs-section">
            <div class="hs-section-title">Текущая синхронизация</div>
            <div style="font-size:28px;font-weight:700;color:#ff6b8a">${c.score}%</div>
            <div class="hs-type">${c.relationType} · ${st.label}</div>
        </div>
        <div class="hs-section">
            <div class="hs-section-title">Достижения</div>
            ${c.milestones.map(m => `
                <div class="hs-milestone ${m.done ? 'done' : ''}">
                    <span>${m.name}</span>
                    <span>${m.threshold}%</span>
                </div>
            `).join('')}
        </div>
        ${c.npcs.length ? `
        <div class="hs-section">
            <div class="hs-section-title">Другие связи</div>
            ${c.npcs.map(n => `
                <div class="hs-npc-row">
                    <span>${n.name}</span>
                    <span>${n.score}%</span>
                </div>
            `).join('')}
        </div>` : ''}
        <button class="hs-btn ${c.sensorsActive ? 'active' : ''}" id="hs-activate-btn">
            ${c.sensorsActive ? 'Sensors Active' : 'Activate Sensors'}
        </button>
    `;

    document.getElementById('hs-close-btn').onclick = closePanel;
    document.getElementById('hs-activate-btn').onclick = () => {
        c.sensorsActive = true;
        save();
        startObserver();
        try { toastr.success('Сенсоры активны. Инструкция автоматически добавляется в промпт.', 'Heartbeat Sync'); } catch {}
        renderPanel();
    };
}

// ===================== WAND =====================
function registerWand() {
    if (document.getElementById('hs-wand-item')) return true;
    const menu = document.getElementById('extensionsMenu');
    if (!menu) return false;
    const item = document.createElement('div');
    item.id = 'hs-wand-item';
    item.className = 'list-group-item flex-container flexGap5 interactable';
    item.innerHTML = '<i class="fa-solid fa-heart-pulse" style="color:#ff4d6d"></i><span>Heartbeat Sync</span>';
    item.onclick = openPanel;
    menu.appendChild(item);
    return true;
}

// ===================== INIT =====================
jQuery(() => {
    try {
        injectStyles();
        updateWidget();

        if (!registerWand()) {
            let tries = 0;
            const iv = setInterval(() => {
                if (registerWand() || ++tries > 30) clearInterval(iv);
            }, 300);
        }

        // Авто-инъекция в промпт
        if (event_types?.CHAT_COMPLETION_PROMPT_READY) {
            eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, injectHeartbeatPrompt);
        }
        if (event_types?.GENERATE_AFTER_COMBINING_PROMPTS) {
            eventSource.on(event_types.GENERATE_AFTER_COMBINING_PROMPTS, injectHeartbeatPrompt);
        }

        if (event_types?.MESSAGE_RECEIVED) {
            eventSource.on(event_types.MESSAGE_RECEIVED, () => {
                setTimeout(() => {
                    const last = document.querySelector('#chat .mes:last-child .mes_text');
                    if (last) parseMessage(last.textContent);
                }, 350);
            });
        }

        if (cfg().sensorsActive) startObserver();

        console.log('[Heartbeat Sync] v1.3 loaded — auto prompt injection enabled');
    } catch (e) {
        console.error('[Heartbeat Sync]', e);
    }
});