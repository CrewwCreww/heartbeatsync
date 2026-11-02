import { eventSource, event_types, saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

const EXT = 'heartbeat-sync';

const defaults = {
    score: 42,
    relationType: 'neutral',
    sensorsActive: false,
    animations: true,
    widgetPos: null,
    npcs: []
};

function cfg() {
    if (!extension_settings[EXT]) extension_settings[EXT] = structuredClone(defaults);
    const c = extension_settings[EXT];
    for (const k in defaults) if (c[k] === undefined) c[k] = structuredClone(defaults[k]);
    return c;
}

function save() {
    try { saveSettingsDebounced(); } catch {}
}

const TYPE_COLORS = {
    neutral:    '#C9A84C',
    romance:    '#9E0E18',
    friendship: '#C28D39',
    rivalry:    '#3E4B8E',
    obsession:  '#3D1534',
    hostile:    '#640606',
    family:     '#B5843A'
};

function getAccent(type) {
    return TYPE_COLORS[type] || TYPE_COLORS.neutral;
}

function injectStyles() {
    if (document.getElementById('hs-css')) return;

    const s = document.createElement('style');
    s.id = 'hs-css';
    s.textContent = `
#hs-widget {
    position: fixed !important;
    top: 120px !important;
    left: 16px !important;
    width: 76px !important;
    height: 76px !important;
    z-index: 999990 !important;
    cursor: grab !important;
    user-select: none !important;
    touch-action: none !important;
    filter: drop-shadow(0 4px 12px rgba(0,0,0,0.55));
}
#hs-widget:active { cursor: grabbing !important; }
#hs-widget.hs-flash { animation: hsFlash 0.5s ease; }

@keyframes hsFlash {
    0% { filter: brightness(1); transform: scale(1); }
    40% { filter: brightness(1.35) drop-shadow(0 0 16px var(--hs-accent)); transform: scale(1.08); }
    100% { filter: brightness(1); transform: scale(1); }
}

.hs-pulse {
    animation: hsPulse var(--spd, 1.1s) ease-in-out infinite;
    transform-origin: center center;
}
.hs-no-anim .hs-pulse { animation: none !important; }

@keyframes hsPulse {
    0%, 100% { transform: scale(1); }
    15% { transform: scale(1.06); }
    30% { transform: scale(1); }
    45% { transform: scale(1.03); }
    60% { transform: scale(1); }
}

#hs-overlay {
    position: fixed !important;
    inset: 0 !important;
    background: rgba(0,0,0,0.7) !important;
    z-index: 1000000 !important;
    display: none !important;
    align-items: flex-end !important;
    justify-content: center !important;
}
#hs-overlay.show { display: flex !important; }

#hs-panel {
    width: 100% !important;
    max-width: 420px !important;
    max-height: 80vh !important;
    background: #0D0D0D !important;
    border-radius: 18px 18px 0 0 !important;
    border: 1px solid #2a2a2a !important;
    border-bottom: none !important;
    color: #F5ECD7 !important;
    font-family: system-ui, -apple-system, sans-serif !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
}

.hs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    background: #111;
    border-bottom: 1px solid #222;
}
.hs-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
}
.hs-header-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: linear-gradient(135deg, #C9A84C, #9E0E18);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: #0D0D0D;
}
.hs-header-title {
    font-weight: 700;
    font-size: 14px;
}
.hs-header-sub {
    font-size: 12px;
    color: #C9A84C;
    margin-top: 1px;
}
.hs-close {
    background: none;
    border: none;
    color: #777;
    font-size: 22px;
    cursor: pointer;
    padding: 4px;
}

.hs-tabs {
    display: flex;
    background: #0f0f0f;
    border-bottom: 1px solid #222;
}
.hs-tab {
    flex: 1;
    text-align: center;
    padding: 12px 4px;
    font-size: 12px;
    font-weight: 600;
    color: #777;
    cursor: pointer;
    border-bottom: 2px solid transparent;
}
.hs-tab.active {
    color: #C9A84C;
    border-bottom-color: #C9A84C;
}

.hs-body {
    padding: 16px;
    overflow-y: auto;
    flex: 1;
}

.hs-big-score {
    font-size: 48px;
    font-weight: 800;
    color: var(--hs-accent, #C9A84C);
    line-height: 1;
}
.hs-type {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    opacity: 0.5;
    margin: 4px 0 18px;
}

.hs-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 11px 0;
    border-bottom: 1px solid #1a1a1a;
    font-size: 14px;
}
.hs-row:last-child { border-bottom: none; }

.hs-switch {
    width: 44px;
    height: 24px;
    background: #333;
    border-radius: 12px;
    position: relative;
    cursor: pointer;
    flex-shrink: 0;
}
.hs-switch.on { background: #C9A84C; }
.hs-switch::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background: #fff;
    border-radius: 50%;
    transition: transform 0.2s;
}
.hs-switch.on::after { transform: translateX(20px); }

.hs-btn {
    width: 100%;
    margin-top: 14px;
    padding: 13px;
    border: none;
    border-radius: 11px;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
}
.hs-btn.primary {
    background: linear-gradient(135deg, #C9A84C, #9E0E18);
    color: #0D0D0D;
}
.hs-btn.ghost {
    background: #1a1a1a;
    color: #ccc;
    margin-top: 8px;
}

.hs-npc-empty {
    text-align: center;
    padding: 28px 10px;
    opacity: 0.4;
    font-size: 13px;
    line-height: 1.5;
}
.hs-npc-item {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid #1a1a1a;
    font-size: 14px;
}
.hs-npc-score {
    font-weight: 700;
    color: #C9A84C;
}

.hs-debug-line {
    font-family: monospace;
    font-size: 12px;
    opacity: 0.7;
    margin-bottom: 6px;
}
`;
    document.head.appendChild(s);
}

function buildStar(score, type) {
    const accent = getAccent(type);
    const fillOpacity = 0.18 + (score / 100) * 0.55;
    const speed = score > 80 ? '0.7s' : score > 50 ? '0.95s' : '1.25s';

    return `
<svg viewBox="0 0 100 100" width="100%" height="100%" class="hs-pulse" style="--hs-accent:\( {accent}; --spd: \){speed}">
  <defs>
    <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#3B2314" stop-opacity="0.85"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="46" fill="none" stroke="${accent}" stroke-width="1.1" opacity="0.28"/>
  <circle cx="50" cy="50" r="41" fill="none" stroke="#C9A84C" stroke-width="0.5" opacity="0.2"/>
  <path d="M50 8 L56 38 L88 32 L64 50 L88 68 L56 62 L50 92 L44 62 L12 68 L36 50 L12 32 L44 38 Z"
        fill="url(#starGrad)" fill-opacity="${fillOpacity}"
        stroke="${accent}" stroke-width="1.3" stroke-linejoin="round"/>
  <path d="M50 28 L58 50 L50 72 L42 50 Z"
        fill="\( {accent}" fill-opacity="0.3" stroke=" \){accent}" stroke-width="0.7"/>
  <text x="50" y="54" text-anchor="middle" fill="#F5ECD7" font-size="14" font-weight="700" font-family="monospace">${Math.round(score)}</text>
</svg>`;
}

function createWidget() {
    let w = document.getElementById('hs-widget');
    if (w) w.remove();

    w = document.createElement('div');
    w.id = 'hs-widget';
    if (!cfg().animations) w.classList.add('hs-no-anim');
    w.innerHTML = buildStar(cfg().score, cfg().relationType);
    document.body.appendChild(w);

    let drag = false;
    let moved = false;
    let grabX = 0, grabY = 0;
    let lastTap = 0;

    w.addEventListener('pointerdown', (e) => {
        const r = w.getBoundingClientRect();
        grabX = e.clientX - r.left;
        grabY = e.clientY - r.top;
        drag = true;
        moved = false;
        w.setPointerCapture(e.pointerId);
        e.preventDefault();
    });

    w.addEventListener('pointermove', (e) => {
        if (!drag) return;

        const dx = Math.abs(e.clientX - (w.getBoundingClientRect().left + grabX));
        const dy = Math.abs(e.clientY - (w.getBoundingClientRect().top + grabY));

        if (!moved && (dx > 4 || dy > 4)) moved = true;
        if (!moved) return;

        let left = e.clientX - grabX;
        let top  = e.clientY - grabY;

        left = Math.max(8, Math.min(window.innerWidth - w.offsetWidth - 8, left));
        top  = Math.max(8, Math.min(window.innerHeight - w.offsetHeight - 8, top));

        w.style.left = left + 'px';
        w.style.top  = top + 'px';
        w.style.right = 'auto';
        w.style.bottom = 'auto';
    });

    w.addEventListener('pointerup', () => {
        if (!drag) return;
        drag = false;

        if (moved) {
            cfg().widgetPos = { top: w.style.top, left: w.style.left };
            save();
            return;
        }

        // Точно как в Love Score
        const now = Date.now();
        if (now - lastTap < 320) {
            lastTap = 0;
            openPanel();
        } else {
            lastTap = now;
            flashWidget();
        }
    });

    w.addEventListener('pointercancel', () => {
        drag = false;
    });

    const pos = cfg().widgetPos;
    if (pos?.top) {
        w.style.top = pos.top;
        w.style.left = pos.left;
        w.style.right = 'auto';
        w.style.bottom = 'auto';
    }
}

function updateWidget() {
    const w = document.getElementById('hs-widget');
    if (!w) return;
    w.innerHTML = buildStar(cfg().score, cfg().relationType);
    if (!cfg().animations) w.classList.add('hs-no-anim');
    else w.classList.remove('hs-no-anim');
}

function flashWidget() {
    const w = document.getElementById('hs-widget');
    if (!w || !cfg().animations) return;
    w.style.setProperty('--hs-accent', getAccent(cfg().relationType));
    w.classList.remove('hs-flash');
    void w.offsetWidth;
    w.classList.add('hs-flash');
}

let currentTab = 'overview';

function openPanel() {
    let ov = document.getElementById('hs-overlay');
    if (!ov) {
        ov = document.createElement('div');
        ov.id = 'hs-overlay';
        ov.innerHTML = '<div id="hs-panel"></div>';
        document.body.appendChild(ov);
        ov.addEventListener('click', (e) => {
            if (e.target === ov) closePanel();
        });
    }
    renderPanel();
    ov.classList.add('show');
}

function closePanel() {
    document.getElementById('hs-overlay')?.classList.remove('show');
}

function renderPanel() {
    const c = cfg();
    const panel = document.getElementById('hs-panel');
    if (!panel) return;

    const accent = getAccent(c.relationType);

    panel.innerHTML = `
        <div class="hs-header">
            <div class="hs-header-left">
                <div class="hs-header-icon">✦</div>
                <div>
                    <div class="hs-header-title">Heartbeat Sync</div>
                    <div class="hs-header-sub">${c.score}% · ${c.relationType}</div>
                </div>
            </div>
            <button class="hs-close" id="hs-close">×</button>
        </div>

        <div class="hs-tabs">
            <div class="hs-tab ${currentTab === 'overview' ? 'active' : ''}" data-tab="overview">Обзор</div>
            <div class="hs-tab ${currentTab === 'settings' ? 'active' : ''}" data-tab="settings">Настройки</div>
            <div class="hs-tab ${currentTab === 'npc' ? 'active' : ''}" data-tab="npc">NPC</div>
            <div class="hs-tab ${currentTab === 'debug' ? 'active' : ''}" data-tab="debug">Отладка</div>
        </div>

        <div class="hs-body" id="hs-body" style="--hs-accent:${accent}"></div>
    `;

    document.getElementById('hs-close').onclick = closePanel;

    panel.querySelectorAll('.hs-tab').forEach(tab => {
        tab.onclick = () => {
            currentTab = tab.dataset.tab;
            renderPanel();
        };
    });

    const body = document.getElementById('hs-body');

    if (currentTab === 'overview') {
        body.innerHTML = `
            <div class="hs-big-score">${c.score}%</div>
            <div class="hs-type">${c.relationType}</div>

            <div class="hs-row">
                <span>Сенсоры</span>
                <span style="color:${c.sensorsActive ? '#C9A84C' : '#666'}; font-weight:600">
                    ${c.sensorsActive ? 'ACTIVE' : 'OFF'}
                </span>
            </div>
            <div class="hs-row">
                <span>Анимации</span>
                <span style="color:${c.animations ? '#C9A84C' : '#666'}; font-weight:600">
                    ${c.animations ? 'ON' : 'OFF'}
                </span>
            </div>

            <button class="hs-btn primary" id="hs-act">
                ${c.sensorsActive ? 'Sensors Active' : 'Activate Sensors'}
            </button>
        `;

        document.getElementById('hs-act').onclick = () => {
            c.sensorsActive = true;
            save();
            try { toastr.success('Сенсоры включены'); } catch {}
            renderPanel();
        };
    }

    if (currentTab === 'settings') {
        body.innerHTML = `
            <div class="hs-row">
                <span>Анимации</span>
                <div class="hs-switch ${c.animations ? 'on' : ''}" id="hs-anim"></div>
            </div>
            <div class="hs-row">
                <span>Сенсоры</span>
                <div class="hs-switch ${c.sensorsActive ? 'on' : ''}" id="hs-sensors"></div>
            </div>
            <button class="hs-btn ghost" id="hs-reset">Сбросить позицию</button>
        `;

        document.getElementById('hs-anim').onclick = () => {
            c.animations = !c.animations;
            save();
            updateWidget();
            renderPanel();
        };
        document.getElementById('hs-sensors').onclick = () => {
            c.sensorsActive = !c.sensorsActive;
            save();
            renderPanel();
        };
        document.getElementById('hs-reset').onclick = () => {
            c.widgetPos = null;
            save();
            const w = document.getElementById('hs-widget');
            if (w) {
                w.style.top = '120px';
                w.style.left = '16px';
                w.style.right = 'auto';
                w.style.bottom = 'auto';
            }
            try { toastr.info('Позиция сброшена'); } catch {}
        };
    }

    if (currentTab === 'npc') {
        body.innerHTML = c.npcs.length === 0
            ? `<div class="hs-npc-empty">Пока нет NPC<br><br>Появятся через тег<br>{{HS::NPC:Имя:XX}}</div>`
            : c.npcs.map(n => `
                <div class="hs-npc-item">
                    <span>${n.name}</span>
                    <span class="hs-npc-score">${n.score}%</span>
                </div>
            `).join('');
    }

    if (currentTab === 'debug') {
        body.innerHTML = `
            <div class="hs-debug-line">score: ${c.score}</div>
            <div class="hs-debug-line">type: ${c.relationType}</div>
            <div class="hs-debug-line">sensors: ${c.sensorsActive}</div>
            <div class="hs-debug-line">animations: ${c.animations}</div>
            <div class="hs-debug-line">npcs: ${c.npcs.length}</div>
            <div class="hs-debug-line">accent: ${getAccent(c.relationType)}</div>
        `;
    }
}

const RE_SYNC = /{{HS::SYNC:(\d{1,3})}}/gi;
const RE_TYPE = /{{HS::TYPE:([^}]+)}}/gi;
const RE_NPC  = /{{HS::NPC:([^:]+):(\d{1,3})}}/gi;

function parseMessage(text) {
    if (!text) return;
    const c = cfg();
    let changed = false;

    const syncs = [...text.matchAll(RE_SYNC)];
    if (syncs.length) {
        const v = Math.max(0, Math.min(100, parseInt(syncs.at(-1)[1], 10)));
        if (v !== c.score) {
            c.score = v;
            changed = true;
            flashWidget();
        }
    }

    const types = [...text.matchAll(RE_TYPE)];
    if (types.length) {
        c.relationType = types.at(-1)[1].trim().toLowerCase();
        changed = true;
    }

    [...text.matchAll(RE_NPC)].forEach(m => {
        const name = m[1].trim();
        const sc = Math.max(0, Math.min(100, parseInt(m[2], 10)));
        let n = c.npcs.find(x => x.name.toLowerCase() === name.toLowerCase());
        if (!n) c.npcs.push({ name, score: sc, type: 'neutral' });
        else n.score = sc;
        changed = true;
    });

    if (changed) {
        save();
        updateWidget();
        if (document.getElementById('hs-overlay')?.classList.contains('show')) {
            renderPanel();
        }
    }
}

function addWand() {
    if (document.getElementById('hs-wand')) return true;
    const menu = document.getElementById('extensionsMenu');
    if (!menu) return false;

    const item = document.createElement('div');
    item.id = 'hs-wand';
    item.className = 'list-group-item flex-container flexGap5 interactable';
    item.innerHTML = '<i class="fa-solid fa-star" style="color:#C9A84C"></i><span>Heartbeat Sync</span>';
    item.onclick = (e) => {
        e.stopPropagation();
        openPanel();
    };
    menu.appendChild(item);
    return true;
}

jQuery(() => {
    try {
        injectStyles();
        createWidget();
        updateWidget();

        if (!addWand()) {
            let tries = 0;
            const t = setInterval(() => {
                if (addWand() || ++tries > 40) clearInterval(t);
            }, 250);
        }

        if (event_types?.MESSAGE_RECEIVED) {
            eventSource.on(event_types.MESSAGE_RECEIVED, () => {
                setTimeout(() => {
                    const el = document.querySelector('#chat .mes:last-child .mes_text');
                    if (el) parseMessage(el.textContent);
                }, 350);
            });
        }

        console.log('[HS] v5.2 — full rewrite with Love Score double-tap');
    } catch (e) {
        console.error('[HS]', e);
    }
});