import { eventSource, event_types, saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

const EXT_NAME = 'heartbeat-sync';

const defaultSettings = {
    isEnabled: true,
    score: 45,
    sensorsActive: false,
    widgetPos: null,
    milestones: [
        { name: 'Доверие', threshold: 35, done: false },
        { name: 'Признание', threshold: 60, done: false },
        { name: 'Поцелуй', threshold: 75, done: false },
        { name: 'Полная синхронизация', threshold: 95, done: false },
    ],
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

// ===================== СТИЛИ (как у Соры) =====================
function injectStyles() {
    if (document.getElementById('hs-styles')) return;

    const el = document.createElement('style');
    el.id = 'hs-styles';
    el.textContent = `
#hs-widget {
    position: fixed;
    top: 120px;
    left: 18px;
    width: 68px;
    height: 68px;
    z-index: 999999;
    cursor: grab;
    user-select: none;
    touch-action: none;
    border-radius: 50%;
    background: rgba(25, 8, 14, 0.9);
    border: 2px solid #ff4d6d;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: monospace;
    font-size: 18px;
    font-weight: 800;
    color: #ff6b8a;
    box-shadow: 0 4px 18px rgba(255, 60, 90, 0.45);
}
#hs-widget:active { cursor: grabbing; }

#hs-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.65);
    z-index: 1000000;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 16px;
}
#hs-overlay.show { display: flex; }

#hs-panel {
    width: min(320px, 92vw);
    max-height: 80vh;
    overflow-y: auto;
    background: rgba(18, 12, 16, 0.96);
    border: 1px solid rgba(255, 70, 100, 0.35);
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
    font-size: 22px;
    cursor: pointer;
}
.hs-score {
    font-size: 30px;
    font-weight: 800;
    color: #ff6b8a;
    margin-bottom: 6px;
}
.hs-btn {
    width: 100%;
    margin-top: 14px;
    padding: 11px;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, #ff4d6d, #c9184a);
    color: white;
    font-weight: 700;
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
    document.head.appendChild(el);
}

// ===================== ВИДЖЕТ (по мотивам heart.js Соры) =====================
function createWidget() {
    if (document.getElementById('hs-widget')) return;

    const w = document.createElement('div');
    w.id = 'hs-widget';
    w.textContent = cfg().score + '%';
    document.body.appendChild(w);

    // перетаскивание + двойной тап
    let drag = false, moved = false, ox = 0, oy = 0, lastTap = 0;

    w.addEventListener('pointerdown', e => {
        const r = w.getBoundingClientRect();
        ox = e.clientX - r.left;
        oy = e.clientY - r.top;
        drag = true;
        moved = false;
        w.setPointerCapture(e.pointerId);
        e.preventDefault();
    });

    w.addEventListener('pointermove', e => {
        if (!drag) return;
        if (Math.abs(e.movementX) > 4 || Math.abs(e.movementY) > 4) moved = true;
        if (!moved) return;
        w.style.left = Math.max(4, Math.min(window.innerWidth - 80, e.clientX - ox)) + 'px';
        w.style.top = Math.max(4, Math.min(window.innerHeight - 80, e.clientY - oy)) + 'px';
        w.style.right = 'auto';
        w.style.bottom = 'auto';
    });

    w.addEventListener('pointerup', () => {
        if (!drag) return;
        drag = false;
        if (moved) {
            cfg().widgetPos = { top: w.style.top, left: w.style.left };
            saveSettingsDebounced();
            return;
        }
        const now = Date.now();
        if (now - lastTap < 300) {
            lastTap = 0;
            openPanel();
        } else {
            lastTap = now;
        }
    });

    // восстановить позицию
    const pos = cfg().widgetPos;
    if (pos?.top) {
        w.style.top = pos.top;
        w.style.left = pos.left;
        w.style.right = 'auto';
        w.style.bottom = 'auto';
    }
}

function refreshWidget() {
    const w = document.getElementById('hs-widget');
    if (w) w.textContent = cfg().score + '%';
}

// ===================== ПАНЕЛЬ =====================
function openPanel() {
    let ov = document.getElementById('hs-overlay');
    if (!ov) {
        ov = document.createElement('div');
        ov.id = 'hs-overlay';
        ov.innerHTML = '<div id="hs-panel"></div>';
        document.body.appendChild(ov);
        ov.addEventListener('click', e => {
            if (e.target === ov) closePanel();
        });
    }

    const c = cfg();
    const panel = document.getElementById('hs-panel');
    panel.innerHTML = `
        <div class="hs-title">
            <span>Heartbeat Sync</span>
            <button class="hs-x" id="hs-close">×</button>
        </div>
        <div class="hs-score">${c.score}%</div>
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
        saveSettingsDebounced();
        try { toastr.success('Сенсоры включены'); } catch {}
        openPanel();
    };

    ov.classList.add('show');
}

function closePanel() {
    document.getElementById('hs-overlay')?.classList.remove('show');
}

// ===================== WAND =====================
function registerWand() {
    if (document.getElementById('hs-wand')) return true;
    const menu = document.getElementById('extensionsMenu');
    if (!menu) return false;

    const item = document.createElement('div');
    item.id = 'hs-wand';
    item.className = 'list-group-item flex-container flexGap5 interactable';
    item.innerHTML = '<i class="fa-solid fa-heart-pulse" style="color:#ff4d6d"></i><span>Heartbeat Sync</span>';
    item.addEventListener('click', openPanel);
    menu.appendChild(item);
    return true;
}

// ===================== INIT (почти 1-в-1 как у Соры) =====================
jQuery(() => {
    try {
        injectStyles();
        createWidget();
        refreshWidget();

        if (!registerWand()) {
            let tries = 0;
            const iv = setInterval(() => {
                if (registerWand() || ++tries > 40) clearInterval(iv);
            }, 250);
            try {
                if (event_types?.APP_READY) eventSource.on(event_types.APP_READY, registerWand);
            } catch {}
        }

        // простой парсер тегов
        if (event_types?.MESSAGE_RECEIVED) {
            eventSource.on(event_types.MESSAGE_RECEIVED, () => {
                setTimeout(() => {
                    const el = document.querySelector('#chat .mes:last-child .mes_text');
                    if (!el) return;
                    const m = el.textContent.match(/{{HS::SYNC:(\d{1,3})}}/i);
                    if (m) {
                        cfg().score = Math.min(100, parseInt(m[1], 10));
                        saveSettingsDebounced();
                        refreshWidget();
                    }
                }, 350);
            });
        }

        console.log('[Heartbeat Sync] loaded');
    } catch (e) {
        console.error('[Heartbeat Sync] init error', e);
        try { toastr.error('Heartbeat Sync: ' + e.message); } catch {}
    }
});