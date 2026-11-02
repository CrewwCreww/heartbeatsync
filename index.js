import { eventSource, event_types, saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

console.log('[HS] script started');

const EXT = 'heartbeat-sync';

const defaults = {
    score: 45,
    sensorsActive: false,
    widgetPos: null,
    milestones: [
        { name: 'Первый контакт', threshold: 15, done: false },
        { name: 'Доверие', threshold: 35, done: false },
        { name: 'Признание', threshold: 60, done: false },
        { name: 'Поцелуй', threshold: 75, done: false },
        { name: 'Полная синхронизация', threshold: 95, done: false },
    ]
};

function cfg() {
    if (!extension_settings[EXT]) extension_settings[EXT] = structuredClone(defaults);
    const c = extension_settings[EXT];
    for (const k in defaults) if (c[k] === undefined) c[k] = structuredClone(defaults[k]);
    return c;
}

function save() {
    try { saveSettingsDebounced(); } catch(e) {}
}

// ========== СТИЛИ ==========
function injectStyles() {
    if (document.getElementById('hs-css')) return;
    const s = document.createElement('style');
    s.id = 'hs-css';
    s.textContent = `
#hs-widget {
    position: fixed !important;
    bottom: 120px !important;
    right: 16px !important;
    width: 80px !important;
    height: 90px !important;
    z-index: 2147483647 !important;
    cursor: grab;
    user-select: none;
    touch-action: none;
    background: rgba(20,10,15,0.6);
    border-radius: 16px;
    border: 1px solid rgba(255,80,110,0.4);
    display: flex !important;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: 800;
    color: #ff6b8a;
    font-family: monospace;
    box-shadow: 0 4px 20px rgba(255,50,80,0.35);
}
#hs-widget:active { cursor: grabbing; }

#hs-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.65);
    z-index: 2147483646;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 16px;
}
#hs-overlay.show { display: flex !important; }

#hs-panel {
    width: min(320px, 92vw);
    background: #1a1218;
    border: 1px solid rgba(255,80,110,0.35);
    border-radius: 14px;
    padding: 16px;
    color: #eee;
    font-family: system-ui, sans-serif;
}
.hs-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 700;
    font-size: 16px;
    color: #ff6b8a;
    margin-bottom: 12px;
}
.hs-x {
    background: none;
    border: none;
    color: #aaa;
    font-size: 24px;
    cursor: pointer;
}
.hs-score {
    font-size: 32px;
    font-weight: 800;
    color: #ff6b8a;
    margin-bottom: 4px;
}
.hs-btn {
    width: 100%;
    margin-top: 14px;
    padding: 12px;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, #ff4d6d, #c9184a);
    color: white;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
}
.hs-btn.on {
    background: linear-gradient(135deg, #2a9d8f, #1a6b63);
}
.hs-line {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 14px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
}
`;
    document.head.appendChild(s);
    console.log('[HS] styles injected');
}

// ========== ВИДЖЕТ ==========
function createWidget() {
    let w = document.getElementById('hs-widget');
    if (w) {
        console.log('[HS] widget already exists');
        return w;
    }

    w = document.createElement('div');
    w.id = 'hs-widget';
    w.textContent = cfg().score + '%';
    document.body.appendChild(w);
    console.log('[HS] widget created and appended');

    // перетаскивание + двойной тап
    let dragging = false, moved = false, startX, startY, lastTap = 0;

    w.addEventListener('pointerdown', e => {
        dragging = true;
        moved = false;
        startX = e.clientX;
        startY = e.clientY;
        w.setPointerCapture(e.pointerId);
        e.preventDefault();
    });

    w.addEventListener('pointermove', e => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
        if (!moved) return;

        const r = w.getBoundingClientRect();
        w.style.left = (r.left + dx) + 'px';
        w.style.top = (r.top + dy) + 'px';
        w.style.right = 'auto';
        w.style.bottom = 'auto';
        startX = e.clientX;
        startY = e.clientY;
    });

    w.addEventListener('pointerup', () => {
        if (!dragging) return;
        dragging = false;
        if (moved) {
            cfg().widgetPos = { top: w.style.top, left: w.style.left };
            save();
            return;
        }
        const now = Date.now();
        if (now - lastTap < 320) {
            lastTap = 0;
            openPanel();
        } else {
            lastTap = now;
        }
    });

    return w;
}

function updateWidget() {
    const w = document.getElementById('hs-widget') || createWidget();
    if (w) w.textContent = cfg().score + '%';
}

// ========== ПАНЕЛЬ ==========
function openPanel() {
    let ov = document.getElementById('hs-overlay');
    if (!ov) {
        ov = document.createElement('div');
        ov.id = 'hs-overlay';
        ov.innerHTML = `<div id="hs-panel"></div>`;
        document.body.appendChild(ov);
        ov.addEventListener('click', e => {
            if (e.target === ov) closePanel();
        });
    }
    ov.classList.add('show');
    renderPanel();
    console.log('[HS] panel opened');
}

function closePanel() {
    document.getElementById('hs-overlay')?.classList.remove('show');
}

function renderPanel() {
    const c = cfg();
    const p = document.getElementById('hs-panel');
    if (!p) return;

    p.innerHTML = `
        <div class="hs-title">
            <span>Heartbeat Sync</span>
            <button class="hs-x" id="hs-close">×</button>
        </div>
        <div class="hs-score">${c.score}%</div>
        <div style="font-size:12px;opacity:0.6;margin-bottom:12px">Синхронизация</div>
        ${c.milestones.map(m => `
            <div class="hs-line">
                <span>${m.name}</span>
                <span>${m.threshold}%</span>
            </div>
        `).join('')}
        <button class="hs-btn ${c.sensorsActive ? 'on' : ''}" id="hs-act">
            ${c.sensorsActive ? 'Sensors Active' : 'Activate Sensors'}
        </button>
    `;

    document.getElementById('hs-close').onclick = closePanel;
    document.getElementById('hs-act').onclick = () => {
        c.sensorsActive = true;
        save();
        try { toastr.success('Сенсоры включены'); } catch {}
        renderPanel();
    };
}

// ========== WAND ==========
function addWand() {
    if (document.getElementById('hs-wand')) return true;
    const menu = document.getElementById('extensionsMenu');
    if (!menu) return false;

    const item = document.createElement('div');
    item.id = 'hs-wand';
    item.className = 'list-group-item flex-container flexGap5 interactable';
    item.innerHTML = `<i class="fa-solid fa-heart-pulse" style="color:#ff4d6d"></i><span>Heartbeat Sync</span>`;
    item.onclick = () => openPanel();
    menu.appendChild(item);
    console.log('[HS] wand item added');
    return true;
}

// ========== INIT ==========
jQuery(() => {
    console.log('[HS] jQuery ready');
    try {
        injectStyles();
        createWidget();
        updateWidget();

        // wand
        if (!addWand()) {
            let tries = 0;
            const iv = setInterval(() => {
                if (addWand() || ++tries > 40) clearInterval(iv);
            }, 200);
        }

        // события
        if (event_types?.MESSAGE_RECEIVED) {
            eventSource.on(event_types.MESSAGE_RECEIVED, () => {
                setTimeout(() => {
                    const last = document.querySelector('#chat .mes:last-child .mes_text');
                    if (!last) return;
                    const m = last.textContent.match(/{{HS::SYNC:(\d{1,3})}}/i);
                    if (m) {
                        cfg().score = Math.min(100, Math.max(0, parseInt(m[1], 10)));
                        save();
                        updateWidget();
                    }
                }, 400);
            });
        }

        console.log('[HS] init complete');
    } catch (e) {
        console.error('[HS] INIT ERROR', e);
        try { toastr.error('Heartbeat Sync error: ' + e.message); } catch {}
    }
});