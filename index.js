import { eventSource, event_types, saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

const EXT = 'heartbeat-sync';

const defaults = {
    score: 42,
    relationType: 'neutral',
    sensorsActive: false,
    animations: true,
    widgetPos: null,
    npcs: [] // { name, score, type }
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

// ===================== ЦВЕТА =====================
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

// ===================== СТИЛИ =====================
function injectStyles() {
    if (document.getElementById('hs-css')) return;

    const s = document.createElement('style');
    s.id = 'hs-css';
    s.textContent = `
#hs-widget {
    position: fixed !important;
    top: 120px !important;
    left: 16px !important;
    width: 78px !important;
    height: 78px !important;
    z-index: 999990 !important;
    cursor: grab !important;
    user-select: none !important;
    touch-action: none !important;
    filter: drop-shadow(0 4px 14px rgba(0,0,0,0.6));
}
#hs-widget:active { cursor: grabbing !important; }
#hs-widget.hs-flash { animation: hsFlash 0.55s ease; }
@keyframes hsFlash {
    0% { filter: brightness(1); transform: scale(1); }
    40% { filter: brightness(1.4) drop-shadow(0 0 18px var(--hs-accent)); transform: scale(1.1); }
    100% { filter: brightness(1); transform: scale(1); }
}
.hs-spin {
    animation: hsSpin 12s linear infinite;
    transform-origin: center;
}
.hs-no-anim .hs-spin { animation: none !important; }
@keyframes hsSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

#hs-overlay {
    position: fixed !important;
    inset: 0 !important;
    background: rgba(0,0,0,0.78) !important;
    z-index: 1000000 !important;
    display: none !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 14px !important;
}
#hs-overlay.show { display: flex !important; }

#hs-panel {
    width: min(380px, 96vw) !important;
    max-height: 88vh !important;
    background: #0D0D0D !important;
    border: 1px solid #3B2314 !important;
    border-radius: 16px !important;
    overflow: hidden !important;
    color: #F5ECD7 !important;
    font-family: system-ui, -apple-system, sans-serif !important;
    box-shadow: 0 25px 60px rgba(0,0,0,0.65);
    display: flex;
    flex-direction: column;
}

.hs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    background: linear-gradient(90deg, #1A1A1A, #0D0D0D);
    border-bottom: 1px solid #3B2314;
}
.hs-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
}
.hs-header-icon {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    background: linear-gradient(135deg, #C9A84C, #9E0E18);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
}
.hs-header-title {
    font-weight: 700;
    font-size: 15px;
    color: #F5ECD7;
}
.hs-close {
    background: none;
    border: none;
    color: #888;
    font-size: 20px;
    cursor: pointer;
    padding: 4px;
}

.hs-tabs {
    display: flex;
    border-bottom: 1px solid #3B2314;
    background: #111;
    overflow-x: auto;
}
.hs-tab {
    flex: 1;
    text-align: center;
    padding: 11px 8px;
    font-size: 12px;
    font-weight: 600;
    color: #888;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    white-space: nowrap;
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

.hs-score {
    font-size: 42px;
    font-weight: 800;
    color: var(--hs-accent, #C9A84C);
    line-height: 1;
}
.hs-type {
    font-size: 13px;
    opacity: 0.55;
    margin: 4px 0 16px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.hs-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    font-size: 14px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
}
.hs-row:last-child { border-bottom: none; }

.hs-switch {
    width: 44px;
    height: 24px;
    background: #333;
    border-radius: 12px;
    position: relative;
    cursor: pointer;
    transition: background 0.2s;
    flex-shrink: 0;
}
.hs-switch.on {
    background: #C9A84C;
}
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
.hs-switch.on::after {
    transform: translateX(20px);
}

.hs-btn {
    width: 100%;
    margin-top: 14px;
    padding: 12px;
    border: none;
    border-radius: 10px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    background: linear-gradient(135deg, #C9A84C, #9E0E18);
    color: #0D0D0D;
}
.hs-btn.ghost {
    background: rgba(255,255,255,0.06);
    color: #ccc;
    margin-top: 8px;
}

.hs-npc-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    font-size: 13px;
}
.hs-npc-score {
    font-weight: 700;
    color: #C9A84C;
}

.hs-debug-line {
    font-size: 12px;
    opacity: 0.7;
    margin-bottom: 6px;
    font-family: monospace;
}
`;
    document.head.appendChild(s);
}

// ===================== ЗВЕЗДА =====================
function buildStar(score, type) {
    const accent = getAccent(type);
    const fillOpacity = 0.15 + (score / 100) * 0.55;

    return `
<svg viewBox="0 0 100 100" width="100%" height="100%" class="hs-spin" style="--hs-accent:${accent}">
  <defs>
    <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#3B2314" stop-opacity="0.8"/>
    </linearGradient>
  </defs>

  <!-- внешнее кольцо -->
  <circle cx="50" cy="50" r="46" fill="none" stroke="${accent}" stroke-width="1.2" opacity="0.35"/>
  <circle cx="50" cy="50" r="42" fill="none" stroke="#C9A84C" stroke-width="0.6" opacity="0.25"/>

  <!-- звезда (8 лучей в стиле наброска) -->
  <path d="M50 8
           L56 38 L88 32 L64 50
           L88 68 L56 62 L50 92
           L44 62 L12 68 L36 50
           L12 32 L44 38 Z"
        fill="url(#starGrad)"
        fill-opacity="${fillOpacity}"
        stroke="${accent}"
        stroke-width="1.4"
        stroke-linejoin="round"/>

  <!-- внутренний ромб -->
  <path d="M50 28 L58 50 L50 72 L42 50 Z"
        fill="${accent}"
        fill-opacity="0.35"
        stroke="${accent}"
        stroke-width="0.8"/>

  <!-- процент -->
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

    let isDragging = false;
    let hasMoved = false;
    let offsetX = 0, offsetY = 0;
    let startX = 0, startY = 0;
    let lastTap = 0;

    w.addEventListener('pointerdown', (e) => {
        const rect = w.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        startX = e.clientX;
        startY = e.clientY;
        isDragging = true;
        hasMoved = false;
        w.setPointerCapture(e.pointerId);
        e.preventDefault();
        e.stopPropagation();
    });

    w.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) hasMoved = true;
        if (!hasMoved) return;

        let left = e.clientX - offsetX;
        let top = e.clientY - offsetY;
        left = Math.max(4, Math.min(window.innerWidth - 90, left));
        top = Math.max(4, Math.min(window.innerHeight - 100, top));

        w.style.left = left + 'px';
        w.style.top = top + 'px';
        w.style.right = 'auto';
        w.style.bottom = 'auto';
    });

    w.addEventListener('pointerup', (e) => {
        if (!isDragging) return;
        isDragging = false;

        if (hasMoved) {
            cfg().widgetPos = { top: w.style.top, left: w.style.left };
            save();
            return;
        }

        const now = Date.now();
        if (now - lastTap < 320) {
            lastTap = 0;
            e.preventDefault();
            e.stopPropagation();
            openPanel();
        } else {
            lastTap = now;
        }
    });

    w.addEventListener('pointercancel', () => { isDragging = false; });

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

// ===================== ПАНЕЛЬ =====================
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
                <div class="hs-header-title">Heartbeat Sync</div>
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

    // ===== ОБЗОР =====
    if (currentTab === 'overview') {
        body.innerHTML = `
            <div class="hs-score">${c.score}%</div>
            <div class="hs-type">${c.relationType}</div>

            <div class="hs-row">
                <span>Сенсоры</span>
                <span style="color:\( {c.sensorsActive ? '#C9A84C' : '#666'}"> \){c.sensorsActive ? 'ACTIVE' : 'OFF'}</span>
            </div>
            <div class="hs-row">
                <span>Анимации</span>
                <span style="color:\( {c.animations ? '#C9A84C' : '#666'}"> \){c.animations ? 'ON' : 'OFF'}</span>
            </div>

            <button class="hs-btn" id="hs-act">
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

    // ===== НАСТРОЙКИ =====
    if (currentTab === 'settings') {
        body.innerHTML = `
            <div class="hs-row">
                <span>Анимации звезды</span>
                <div class="hs-switch ${c.animations ? 'on' : ''}" id="hs-anim"></div>
            </div>
            <div class="hs-row">
                <span>Сенсоры</span>
                <div class="hs-switch ${c.sensorsActive ? 'on' : ''}" id="hs-sensors"></div>
            </div>

            <button class="hs-btn ghost" id="hs-reset">Сбросить позицию виджета</button>
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

    // ===== NPC =====
    if (currentTab === 'npc') {
        body.innerHTML = `
            <div style="font-size:13px;opacity:0.6;margin-bottom:12px">
                Отслеживание отношений с несколькими персонажами
            </div>
            ${c.npcs.length === 0 ? `
                <div style="opacity:0.4;font-size:13px;padding:20px 0;text-align:center">
                    Пока нет NPC.<br>Они появятся через теги {{HS::NPC:Имя:XX}}
                </div>
            ` : c.npcs.map(n => `
                <div class="hs-npc-item">
                    <span>${n.name}</span>
                    <span class="hs-npc-score">${n.score}%</span>
                </div>
            `).join('')}
        `;
    }

    // ===== ОТЛАДКА =====
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

// ===================== ПАРСЕР =====================
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

// ===================== WAND =====================
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

// ===================== INIT =====================
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

        console.log('[HS] v4.0 — star + 4 tabs');
    } catch (e) {
        console.error('[HS]', e);
    }
});