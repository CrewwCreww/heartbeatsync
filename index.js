import { eventSource, event_types, saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

const EXT = 'heartbeat-sync';

const defaults = {
    score: 42,
    sensorsActive: false,
    animations: true,
    widgetPos: null,
    relationType: 'neutral'
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
    width: 82px !important;
    height: 94px !important;
    z-index: 999990 !important;
    cursor: grab !important;
    user-select: none !important;
    touch-action: none !important;
    filter: drop-shadow(0 6px 16px rgba(180, 20, 40, 0.45));
}
#hs-widget:active { cursor: grabbing !important; }
#hs-widget.hs-flash { animation: hsFlash 0.6s ease; }
@keyframes hsFlash {
    0% { filter: brightness(1); transform: scale(1); }
    40% { filter: brightness(1.55) drop-shadow(0 0 22px #ff4d6d); transform: scale(1.12); }
    100% { filter: brightness(1); transform: scale(1); }
}
.hs-beat { animation: hsBeat var(--spd, 1.05s) ease-in-out infinite; transform-origin: center; }
.hs-no-anim .hs-beat { animation: none !important; }
@keyframes hsBeat {
    0%,100% { transform: scale(1); }
    14% { transform: scale(1.07); }
    28% { transform: scale(1); }
    42% { transform: scale(1.04); }
    56% { transform: scale(1); }
}
.hs-ecg { animation: hsEcg 1.3s linear infinite; }
.hs-no-anim .hs-ecg { animation: none !important; }
@keyframes hsEcg { to { stroke-dashoffset: -26; } }

#hs-overlay {
    position: fixed !important;
    inset: 0 !important;
    background: rgba(0,0,0,0.72) !important;
    z-index: 1000000 !important;
    display: none !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 12px !important;
}
#hs-overlay.show { display: flex !important; }

#hs-panel {
    width: min(380px, 96vw) !important;
    max-height: 88vh !important;
    overflow: hidden !important;
    background: #121014 !important;
    border: 1px solid rgba(255, 80, 110, 0.25) !important;
    border-radius: 18px !important;
    color: #e8e0e4 !important;
    font-family: system-ui, -apple-system, sans-serif !important;
    box-shadow: 0 25px 60px rgba(0,0,0,0.6);
    display: flex;
    flex-direction: column;
}

.hs-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    flex-shrink: 0;
}
.hs-header-icon {
    width: 40px;
    height: 40px;
    border-radius: 11px;
    background: linear-gradient(135deg, #ff4d6d, #c9184a);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
}
.hs-header-text { flex: 1; min-width: 0; }
.hs-header-title {
    font-weight: 700;
    font-size: 15px;
    color: #fff;
}
.hs-header-sub {
    font-size: 11px;
    opacity: 0.45;
    margin-top: 1px;
}
.hs-close {
    background: none;
    border: none;
    color: #777;
    font-size: 22px;
    cursor: pointer;
    padding: 4px;
    line-height: 1;
}

.hs-tabs {
    display: flex;
    gap: 0;
    padding: 0 12px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    flex-shrink: 0;
    overflow-x: auto;
}
.hs-tab {
    padding: 11px 14px;
    font-size: 13px;
    font-weight: 600;
    color: #888;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    white-space: nowrap;
}
.hs-tab.active {
    color: #ff6b8a;
    border-bottom-color: #ff4d6d;
}

.hs-body {
    padding: 16px;
    overflow-y: auto;
    flex: 1;
}

.hs-score-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 6px;
}
.hs-score-big {
    font-size: 36px;
    font-weight: 800;
    color: #ff6b8a;
    line-height: 1;
    letter-spacing: -0.5px;
}
.hs-score-max {
    font-size: 14px;
    opacity: 0.4;
}
.hs-type {
    font-size: 12px;
    opacity: 0.5;
    margin-bottom: 18px;
}

.hs-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 12px 14px;
    margin-bottom: 10px;
}
.hs-card-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    opacity: 0.4;
    margin-bottom: 8px;
}

.hs-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 14px;
}
.hs-switch {
    width: 44px;
    height: 26px;
    background: rgba(255,255,255,0.12);
    border-radius: 13px;
    position: relative;
    cursor: pointer;
    transition: background 0.2s;
    flex-shrink: 0;
}
.hs-switch.on { background: #ff4d6d; }
.hs-switch::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    background: #fff;
    border-radius: 50%;
    transition: transform 0.2s;
}
.hs-switch.on::after { transform: translateX(18px); }

.hs-btn {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 11px;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    margin-top: 6px;
}
.hs-btn.primary {
    background: linear-gradient(135deg, #ff4d6d, #c9184a);
    color: #fff;
}
.hs-btn.primary.on {
    background: linear-gradient(135deg, #2a9d8f, #1a6b63);
}
.hs-btn.ghost {
    background: rgba(255,255,255,0.06);
    color: #ccc;
}

.hs-status-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}
.hs-status-item {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px;
    padding: 10px;
    text-align: center;
}
.hs-status-value {
    font-size: 16px;
    font-weight: 700;
    color: #ff6b8a;
}
.hs-status-label {
    font-size: 10px;
    opacity: 0.45;
    margin-top: 2px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
}
`;
    document.head.appendChild(s);
}

// ===================== СЕРДЦЕ =====================
function visual(score) {
    const s = Math.max(0, Math.min(100, score));
    if (s <= 20) return { h: 210, sat: 28, l: 36, spd: 1.45 };
    if (s <= 50) return { h: 0, sat: 58, l: 40, spd: 1.05 };
    if (s <= 80) return { h: 350, sat: 80, l: 48, spd: 0.78 };
    return { h: 0, sat: 95, l: 52, spd: 0.52 };
}

function buildHeart(score) {
    const v = visual(score);
    const fill = `hsl(${v.h}, ${v.sat}%, ${v.l}%)`;
    const vessel = `hsl(${v.h}, ${Math.min(100, v.sat + 12)}%, ${Math.min(68, v.l + 12)}%)`;
    const fillH = (score / 100) * 80;

    return `
<svg viewBox="0 0 100 112" width="100%" height="100%" class="hs-beat" style="--spd:${v.spd}s">
  <defs>
    <clipPath id="hsclip">
      <path d="M50 95 C50 95 15 69 15 42 C15 26 27 14 42 14 C47 14 50 18 50 18 C50 18 53 14 58 14 C73 14 85 26 85 42 C85 69 50 95 50 95 Z"/>
    </clipPath>
    <linearGradient id="hsglass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.25)"/>
      <stop offset="60%" stop-color="rgba(255,255,255,0.05)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.2)"/>
    </linearGradient>
  </defs>
  <path d="M50 95 C50 95 15 69 15 42 C15 26 27 14 42 14 C47 14 50 18 50 18 C50 18 53 14 58 14 C73 14 85 26 85 42 C85 69 50 95 50 95 Z"
        fill="rgba(12,6,10,0.88)" stroke="rgba(255,80,110,0.5)" stroke-width="1.7"/>
  <rect x="0" y="\( {95 - fillH}" width="100" height=" \){fillH}" clip-path="url(#hsclip)" fill="${fill}" opacity="0.9"/>
  <g fill="none" stroke="${vessel}" stroke-width="1.1" opacity="0.85">
    <path d="M37 35 Q45 47 42 61"/>
    <path d="M63 33 Q55 48 58 62"/>
    <path d="M50 25 Q48 43 50 67"/>
    <path d="M33 50 Q41 56 48 53"/>
    <path d="M67 48 Q59 56 52 54"/>
  </g>
  <path d="M50 95 C50 95 15 69 15 42 C15 26 27 14 42 14 C47 14 50 18 50 18 C50 18 53 14 58 14 C73 14 85 26 85 42 C85 69 50 95 50 95 Z"
        fill="url(#hsglass)" opacity="0.55"/>
  <polyline points="19,75 28,75 32,65 36,85 40,75 53,75 57,67 61,83 65,75 81,75"
            fill="none" stroke="${vessel}" stroke-width="1.25" stroke-linecap="round"
            stroke-dasharray="4.5 2.5" class="hs-ecg"/>
  <text x="50" y="49" text-anchor="middle" fill="#fff" font-size="17" font-weight="700" font-family="monospace">${Math.round(score)}</text>
  <text x="50" y="60" text-anchor="middle" fill="rgba(255,255,255,0.65)" font-size="8" font-family="monospace">%</text>
</svg>`;
}

function createWidget() {
    let w = document.getElementById('hs-widget');
    if (w) w.remove();

    w = document.createElement('div');
    w.id = 'hs-widget';
    if (!cfg().animations) w.classList.add('hs-no-anim');
    w.innerHTML = buildHeart(cfg().score);
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
        top = Math.max(4, Math.min(window.innerHeight - 110, top));

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
    w.innerHTML = buildHeart(cfg().score);
    if (!cfg().animations) w.classList.add('hs-no-anim');
    else w.classList.remove('hs-no-anim');
}

function flashWidget() {
    const w = document.getElementById('hs-widget');
    if (!w || !cfg().animations) return;
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

    panel.innerHTML = `
        <div class="hs-header">
            <div class="hs-header-icon">❤️</div>
            <div class="hs-header-text">
                <div class="hs-header-title">Heartbeat Sync</div>
                <div class="hs-header-sub">Синхронизация</div>
            </div>
            <button class="hs-close" id="hs-close">×</button>
        </div>

        <div class="hs-tabs">
            <div class="hs-tab ${currentTab === 'overview' ? 'active' : ''}" data-tab="overview">Обзор</div>
            <div class="hs-tab ${currentTab === 'settings' ? 'active' : ''}" data-tab="settings">Настройки</div>
        </div>

        <div class="hs-body" id="hs-body"></div>
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
            <div class="hs-score-row">
                <div class="hs-score-big">${c.score}</div>
                <div class="hs-score-max">/ 100</div>
            </div>
            <div class="hs-type">${c.relationType || 'neutral'}</div>

            <div class="hs-status-grid">
                <div class="hs-status-item">
                    <div class="hs-status-value">${c.sensorsActive ? 'ON' : 'OFF'}</div>
                    <div class="hs-status-label">Sensors</div>
                </div>
                <div class="hs-status-item">
                    <div class="hs-status-value">${c.animations ? 'ON' : 'OFF'}</div>
                    <div class="hs-status-label">Анимации</div>
                </div>
            </div>

            <div style="margin-top: 16px">
                <button class="hs-btn primary ${c.sensorsActive ? 'on' : ''}" id="hs-act">
                    ${c.sensorsActive ? 'Sensors Active' : 'Activate Sensors'}
                </button>
            </div>
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
            <div class="hs-card">
                <div class="hs-card-title">Виджет</div>
                <div class="hs-toggle-row">
                    <span>Анимации сердца и ЭКГ</span>
                    <div class="hs-switch ${c.animations ? 'on' : ''}" id="hs-anim-toggle"></div>
                </div>
            </div>

            <div class="hs-card">
                <div class="hs-card-title">Сенсоры</div>
                <div class="hs-toggle-row">
                    <span>Авто-инъекция тегов</span>
                    <div class="hs-switch ${c.sensorsActive ? 'on' : ''}" id="hs-sensors-toggle"></div>
                </div>
            </div>

            <button class="hs-btn ghost" id="hs-reset-pos">Сбросить позицию виджета</button>
        `;

        document.getElementById('hs-anim-toggle').onclick = () => {
            c.animations = !c.animations;
            save();
            updateWidget();
            renderPanel();
        };

        document.getElementById('hs-sensors-toggle').onclick = () => {
            c.sensorsActive = !c.sensorsActive;
            save();
            renderPanel();
        };

        document.getElementById('hs-reset-pos').onclick = () => {
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
                    if (!el) return;
                    const m = el.textContent.match(/{{HS::SYNC:(\d{1,3})}}/i);
                    if (m) {
                        const val = Math.min(100, parseInt(m[1], 10));
                        if (val !== cfg().score) {
                            cfg().score = val;
                            save();
                            updateWidget();
                            flashWidget();
                        }
                    }
                }, 350);
            });
        }

        console.log('[HS] v3.4 — clean panel');
    } catch (e) {
        console.error('[HS]', e);
    }
});