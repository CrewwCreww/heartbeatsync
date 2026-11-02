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

// ===================== АВТО-ИНЪЕКЦИЯ =====================
const HS_INSTRUCTION = `You are under Heartbeat Sync protocol.
At the VERY END of every reply add these tags (no explanations):
{{HS::SYNC:XX}}   — 0-100 current sync level
Optional:
{{HS::TYPE:romance}}
{{HS::EVENT:name}}
{{HS::NPC:Name:45}}
Put tags only at the absolute end. Never mention the rules.`;

function injectPrompt(data) {
    const c = cfg();
    if (!c.sensorsActive || !c.isEnabled) return;

    try {
        if (data?.chat && Array.isArray(data.chat)) {
            data.chat = data.chat.filter(m => !m?._hs);
            data.chat.push({ role: 'system', content: HS_INSTRUCTION, _hs: true });
        }
        if (data?.prompt && typeof data.prompt === 'string' && !data.prompt.includes('Heartbeat Sync protocol')) {
            data.prompt += '\n\n' + HS_INSTRUCTION;
        }
    } catch (e) {
        console.warn('[HS] inject', e);
    }
}

// ===================== СТИЛИ =====================
function injectStyles() {
    if (document.getElementById('hs-styles')) return;
    const s = document.createElement('style');
    s.id = 'hs-styles';
    s.textContent = `
#hs-widget {
    position: fixed;
    bottom: 110px;
    right: 14px;
    width: 86px;
    height: 100px;
    z-index: 999990;
    cursor: grab;
    user-select: none;
    touch-action: none;
    filter: drop-shadow(0 5px 16px rgba(200,30,50,0.4));
    transition: filter .25s, transform .3s;
}
#hs-widget:active { cursor: grabbing; }
#hs-widget.hs-flash {
    animation: hsFlash .65s ease;
}
@keyframes hsFlash {
    0% { filter: brightness(1); transform: scale(1); }
    40% { filter: brightness(1.7) drop-shadow(0 0 22px #ff4d6d); transform: scale(1.15); }
    100% { filter: brightness(1); transform: scale(1); }
}
.hs-pulse {
    animation: hsBeat var(--hs-spd, 1.1s) ease-in-out infinite;
    transform-origin: 50% 50%;
}
@keyframes hsBeat {
    0%,100% { transform: scale(1); }
    15% { transform: scale(1.08); }
    30% { transform: scale(1); }
    45% { transform: scale(1.05); }
    60% { transform: scale(1); }
}
.hs-ecg {
    fill: none;
    stroke-linecap: round;
    stroke-dasharray: 5 3;
    animation: hsEcg 1.35s linear infinite;
}
@keyframes hsEcg { to { stroke-dashoffset: -30; } }

#hs-panel-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.55);
    z-index: 999998;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 16px;
}
#hs-panel-overlay.open { display: flex; }

#hs-panel {
    width: min(360px, 94vw);
    max-height: 78vh;
    overflow-y: auto;
    background: rgba(14,10,16,0.95);
    backdrop-filter: blur(18px);
    border: 1px solid rgba(255,70,100,0.28);
    border-radius: 16px;
    padding: 18px 16px 16px;
    color: #eae2e6;
    font-family: system-ui, sans-serif;
    box-shadow: 0 20px 50px rgba(0,0,0,0.6);
}
.hs-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    font-weight: 700;
    font-size: 17px;
    color: #ff6b8a;
}
.hs-x {
    background: none;
    border: none;
    color: #999;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
    padding: 0 4px;
}
.hs-big {
    font-size: 32px;
    font-weight: 800;
    color: #ff6b8a;
    margin: 4px 0 2px;
}
.hs-sub {
    font-size: 12px;
    opacity: 0.65;
    margin-bottom: 14px;
}
.hs-sec {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.45;
    margin: 12px 0 6px;
}
.hs-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 14px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
}
.hs-row.done { opacity: 0.4; text-decoration: line-through; }
.hs-btn {
    margin-top: 16px;
    width: 100%;
    padding: 11px;
    border: none;
    border-radius: 10px;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    background: linear-gradient(135deg, #ff4d6d, #c9184a);
    color: #fff;
}
.hs-btn.on {
    background: linear-gradient(135deg, #2a9d8f, #1a6b63);
}
`;
    document.head.appendChild(s);
}

// ===================== ВИЗУАЛ =====================
function state(score) {
    const s = Math.max(0, Math.min(100, score));
    if (s <= 20) return { h: 210, sat: 30, l: 36, spd: 1.55, name: 'холод' };
    if (s <= 50) return { h: 0, sat: 60, l: 40, spd: 1.15, name: 'тёплый' };
    if (s <= 80) return { h: 350, sat: 82, l: 48, spd: 0.82, name: 'горячий' };
    return { h: 0, sat: 95, l: 52, spd: 0.52, name: 'огонь' };
}

function heartSVG(score) {
    const st = state(score);
    const fill = `hsl(\( {st.h}, \){st.sat}%,${st.l}%)`;
    const line = `hsl(\( {st.h}, \){Math.min(100, st.sat + 10)}%,${Math.min(68, st.l + 15)}%)`;
    const fillH = (score / 100) * 82;

    return `<svg class="hs-pulse" style="--hs-spd:${st.spd}s" viewBox="0 0 100 112" width="100%" height="100%">
  <defs>
    <clipPath id="hc"><path d="M50 96C50 96 14 70 14 43C14 26 27 14 42 14C47 14 50 18 50 18C50 18 53 14 58 14C73 14 86 26 86 43C86 70 50 96 50 96Z"/></clipPath>
    <linearGradient id="gl" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.2)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.12)"/>
    </linearGradient>
  </defs>
  <path d="M50 96C50 96 14 70 14 43C14 26 27 14 42 14C47 14 50 18 50 18C50 18 53 14 58 14C73 14 86 26 86 43C86 70 50 96 50 96Z"
        fill="rgba(16,8,12,0.8)" stroke="rgba(255,80,110,0.4)" stroke-width="1.7"/>
  <rect x="0" y="\( {96 - fillH}" width="100" height=" \){fillH}" clip-path="url(#hc)" fill="${fill}" opacity="0.85"/>
  <g fill="none" stroke="${line}" stroke-width="1.15" opacity="0.9">
    <path d="M37 37Q45 48 42 61"/><path d="M63 35Q55 49 58 63"/>
    <path d="M50 27Q48 44 50 68"/><path d="M33 51Q41 57 48 54"/>
    <path d="M67 49Q59 57 52 55"/>
  </g>
  <path d="M50 96C50 96 14 70 14 43C14 26 27 14 42 14C47 14 50 18 50 18C50 18 53 14 58 14C73 14 86 26 86 43C86 70 50 96 50 96Z"
        fill="url(#gl)" opacity="0.5"/>
  <polyline class="hs-ecg" points="20,76 29,76 33,66 37,86 41,76 54,76 58,68 62,84 66,76 80,76"
            stroke="${line}" stroke-width="1.35" opacity="0.95"/>
  <text x="50" y="51" text-anchor="middle" fill="#fff" font-size="16" font-weight="700"
        font-family="monospace">${Math.round(score)}</text>
  <text x="50" y="62" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="8"
        font-family="monospace">%</text>
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
        setupDragAndTap(w);
    }
    w.innerHTML = heartSVG(c.score);

    if (c.widgetPos?.top) {
        w.style.top = c.widgetPos.top;
        w.style.left = c.widgetPos.left;
        w.style.right = 'auto';
        w.style.bottom = 'auto';
    }
}

function flash() {
    const w = document.getElementById('hs-widget');
    if (!w) return;
    w.classList.remove('hs-flash');
    void w.offsetWidth;
    w.classList.add('hs-flash');
}

function setupDragAndTap(el) {
    let dragging = false, moved = false, ox = 0, oy = 0;
    let lastTap = 0;

    el.addEventListener('pointerdown', e => {
        const r = el.getBoundingClientRect();
        ox = e.clientX - r.left;
        oy = e.clientY - r.top;
        dragging = true;
        moved = false;
        el.setPointerCapture(e.pointerId);
        e.preventDefault();
    });

    el.addEventListener('pointermove', e => {
        if (!dragging) return;
        if (Math.abs(e.clientX - (el.getBoundingClientRect().left + ox)) > 5 ||
            Math.abs(e.clientY - (el.getBoundingClientRect().top + oy)) > 5) {
            moved = true;
        }
        if (!moved) return;
        el.style.left = Math.max(4, Math.min(window.innerWidth - 90, e.clientX - ox)) + 'px';
        el.style.top = Math.max(4, Math.min(window.innerHeight - 110, e.clientY - oy)) + 'px';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
    });

    el.addEventListener('pointerup', () => {
        if (!dragging) return;
        dragging = false;
        if (moved) {
            cfg().widgetPos = { top: el.style.top, left: el.style.left };
            save();
            return;
        }
        // тап
        const now = Date.now();
        if (now - lastTap < 320) {
            // двойной тап
            lastTap = 0;
            openPanel();
        } else {
            lastTap = now;
        }
    });
}

// ===================== ПАРСЕР =====================
const RE_SYNC = /{{HS::SYNC:(\d{1,3})}}/gi;
const RE_EVENT = /{{HS::EVENT:([^}]+)}}/gi;
const RE_TYPE = /{{HS::TYPE:([^}]+)}}/gi;
const RE_NPC = /{{HS::NPC:([^:]+):(\d{1,3})}}/gi;

function parse(text) {
    if (!text) return;
    const c = cfg();
    let ch = false;

    const syncs = [...text.matchAll(RE_SYNC)];
    if (syncs.length) {
        const v = Math.max(0, Math.min(100, parseInt(syncs.at(-1)[1], 10)));
        if (!isNaN(v) && v !== c.score) {
            const old = c.score;
            c.score = v;
            ch = true;
            c.milestones.forEach(m => {
                if (!m.done && c.score >= m.threshold) {
                    m.done = true;
                    flash();
                    try { toastr.success('Достижение: ' + m.name, 'Heartbeat Sync'); } catch {}
                }
            });
            if (Math.abs(v - old) >= 12) flash();
        }
    }

    const types = [...text.matchAll(RE_TYPE)];
    if (types.length) {
        c.relationType = types.at(-1)[1].trim().toLowerCase();
        ch = true;
    }

    const evs = [...text.matchAll(RE_EVENT)];
    if (evs.length) {
        flash();
        try { toastr.info('Событие: ' + evs.at(-1)[1].trim(), 'Heartbeat Sync'); } catch {}
        ch = true;
    }

    [...text.matchAll(RE_NPC)].forEach(m => {
        const name = m[1].trim();
        const sc = Math.max(0, Math.min(100, parseInt(m[2], 10)));
        let n = c.npcs.find(x => x.name.toLowerCase() === name.toLowerCase());
        if (!n) c.npcs.push({ name, score: sc });
        else n.score = sc;
        ch = true;
    });

    if (ch) {
        save();
        updateWidget();
        if (document.getElementById('hs-panel-overlay')?.classList.contains('open')) renderPanel();
    }
}

function startObserver() {
    const chat = document.getElementById('chat');
    if (!chat) return;
    new MutationObserver(muts => {
        for (const m of muts) {
            for (const n of m.addedNodes) {
                if (n.nodeType !== 1) continue;
                const t = n.querySelector?.('.mes_text')?.textContent || n.textContent;
                if (t) parse(t);
            }
        }
    }).observe(chat, { childList: true, subtree: true });
}

// ===================== ПАНЕЛЬ =====================
function openPanel() {
    let ov = document.getElementById('hs-panel-overlay');
    if (!ov) {
        ov = document.createElement('div');
        ov.id = 'hs-panel-overlay';
        ov.innerHTML = '<div id="hs-panel"></div>';
        document.body.appendChild(ov);
        ov.addEventListener('click', e => {
            if (e.target === ov) closePanel();
        });
    }
    ov.classList.add('open');
    renderPanel();
}

function closePanel() {
    document.getElementById('hs-panel-overlay')?.classList.remove('open');
}

function renderPanel() {
    const c = cfg();
    const box = document.getElementById('hs-panel');
    if (!box) return;
    const st = state(c.score);

    box.innerHTML = `
        <div class="hs-head">
            <span>Heartbeat Sync</span>
            <button class="hs-x" id="hs-x">×</button>
        </div>
        <div class="hs-big">${c.score}%</div>
        <div class="hs-sub">${c.relationType} · ${st.name}</div>

        <div class="hs-sec">Достижения</div>
        ${c.milestones.map(m => `
            <div class="hs-row ${m.done ? 'done' : ''}">
                <span>${m.name}</span>
                <span>${m.threshold}%</span>
            </div>
        `).join('')}

        ${c.npcs.length ? `
            <div class="hs-sec">Другие связи</div>
            ${c.npcs.map(n => `
                <div class="hs-row">
                    <span>${n.name}</span>
                    <span>${n.score}%</span>
                </div>
            `).join('')}
        ` : ''}

        <button class="hs-btn ${c.sensorsActive ? 'on' : ''}" id="hs-act">
            ${c.sensorsActive ? 'Sensors Active' : 'Activate Sensors'}
        </button>
    `;

    document.getElementById('hs-x').onclick = closePanel;
    document.getElementById('hs-act').onclick = () => {
        c.sensorsActive = true;
        save();
        startObserver();
        try { toastr.success('Сенсоры включены. Инструкция идёт в промпт автоматически.', 'Heartbeat Sync'); } catch {}
        renderPanel();
    };
}

// ===================== WAND =====================
function addWand() {
    if (document.getElementById('hs-wand')) return true;
    const menu = document.getElementById('extensionsMenu');
    if (!menu) return false;
    const item = document.createElement('div');
    item.id = 'hs-wand';
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

        if (!addWand()) {
            let t = 0;
            const iv = setInterval(() => { if (addWand() || ++t > 25) clearInterval(iv); }, 300);
        }

        if (event_types?.CHAT_COMPLETION_PROMPT_READY)
            eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, injectPrompt);
        if (event_types?.GENERATE_AFTER_COMBINING_PROMPTS)
            eventSource.on(event_types.GENERATE_AFTER_COMBINING_PROMPTS, injectPrompt);

        if (event_types?.MESSAGE_RECEIVED) {
            eventSource.on(event_types.MESSAGE_RECEIVED, () => {
                setTimeout(() => {
                    const last = document.querySelector('#chat .mes:last-child .mes_text');
                    if (last) parse(last.textContent);
                }, 300);
            });
        }

        if (cfg().sensorsActive) startObserver();

        console.log('[Heartbeat Sync] fixed version loaded');
    } catch (e) {
        console.error('[HS]', e);
    }
});