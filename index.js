import { eventSource, event_types, saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

console.log('[HS] loading...');

const EXT = 'heartbeat-sync';

function cfg() {
    if (!extension_settings[EXT]) {
        extension_settings[EXT] = {
            score: 45,
            sensorsActive: false,
            milestones: [
                { name: 'Доверие', threshold: 35, done: false },
                { name: 'Признание', threshold: 60, done: false },
                { name: 'Поцелуй', threshold: 75, done: false },
                { name: 'Полная синхронизация', threshold: 95, done: false },
            ]
        };
    }
    return extension_settings[EXT];
}

function save() {
    try { saveSettingsDebounced(); } catch {}
}

// ===== СТИЛИ =====
function injectStyles() {
    if (document.getElementById('hs-css')) return;

    const s = document.createElement('style');
    s.id = 'hs-css';
    s.textContent = `
#hs-widget {
    position: fixed !important;
    bottom: 130px !important;
    right: 18px !important;
    width: 72px !important;
    height: 72px !important;
    z-index: 999999 !important;
    background: rgba(30, 10, 18, 0.85) !important;
    border: 2px solid #ff4d6d !important;
    border-radius: 50% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 20px !important;
    font-weight: 800 !important;
    color: #ff6b8a !important;
    font-family: monospace !important;
    box-shadow: 0 0 20px rgba(255, 60, 90, 0.5) !important;
    cursor: pointer !important;
    user-select: none !important;
    touch-action: none !important;
}

#hs-overlay {
    position: fixed !important;
    inset: 0 !important;
    background: rgba(0,0,0,0.7) !important;
    z-index: 1000000 !important;
    display: none !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 16px !important;
}
#hs-overlay.show {
    display: flex !important;
}

#hs-panel {
    width: min(300px, 90vw) !important;
    background: #1a1218 !important;
    border: 1px solid #ff4d6d !important;
    border-radius: 14px !important;
    padding: 16px !important;
    color: #eee !important;
}
.hs-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 700;
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
.hs-btn {
    width: 100%;
    margin-top: 12px;
    padding: 12px;
    border: none;
    border-radius: 10px;
    background: #ff4d6d;
    color: white;
    font-weight: 700;
    cursor: pointer;
}
.hs-btn.on {
    background: #2a9d8f;
}
.hs-line {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    font-size: 14px;
}
`;
    document.head.appendChild(s);
}

// ===== ВИДЖЕТ =====
function createWidget() {
    if (document.getElementById('hs-widget')) return;

    const w = document.createElement('div');
    w.id = 'hs-widget';
    w.textContent = cfg().score + '%';
    document.body.appendChild(w);

    // двойной тап / клик
    let last = 0;
    w.addEventListener('pointerup', () => {
        const now = Date.now();
        if (now - last < 300) {
            openPanel();
            last = 0;
        } else {
            last = now;
        }
    });

    console.log('[HS] widget created');
}

function updateWidget() {
    const w = document.getElementById('hs-widget');
    if (w) w.textContent = cfg().score + '%';
}

// ===== ПАНЕЛЬ =====
function openPanel() {
    let ov = document.getElementById('hs-overlay');
    if (!ov) {
        ov = document.createElement('div');
        ov.id = 'hs-overlay';
        ov.innerHTML = `<div id="hs-panel"></div>`;
        document.body.appendChild(ov);

        ov.addEventListener('click', (e) => {
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
        <div style="font-size:28px;font-weight:800;color:#ff6b8a;margin-bottom:8px">${c.score}%</div>
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
        openPanel(); // перерисовать
    };

    ov.classList.add('show');
}

function closePanel() {
    document.getElementById('hs-overlay')?.classList.remove('show');
}

// ===== WAND =====
function addWand() {
    if (document.getElementById('hs-wand')) return true;
    const menu = document.getElementById('extensionsMenu');
    if (!menu) return false;

    const item = document.createElement('div');
    item.id = 'hs-wand';
    item.className = 'list-group-item flex-container flexGap5 interactable';
    item.innerHTML = `<i class="fa-solid fa-heart-pulse" style="color:#ff4d6d"></i><span>Heartbeat Sync</span>`;
    item.onclick = openPanel;
    menu.appendChild(item);
    return true;
}

// ===== INIT =====
jQuery(() => {
    try {
        injectStyles();
        createWidget();
        updateWidget();

        // wand
        if (!addWand()) {
            let tries = 0;
            const t = setInterval(() => {
                if (addWand() || ++tries > 30) clearInterval(t);
            }, 250);
        }

        // парсер простых тегов
        if (event_types?.MESSAGE_RECEIVED) {
            eventSource.on(event_types.MESSAGE_RECEIVED, () => {
                setTimeout(() => {
                    const el = document.querySelector('#chat .mes:last-child .mes_text');
                    if (!el) return;
                    const m = el.textContent.match(/{{HS::SYNC:(\d{1,3})}}/i);
                    if (m) {
                        cfg().score = Math.min(100, parseInt(m[1], 10));
                        save();
                        updateWidget();
                    }
                }, 400);
            });
        }

        console.log('[HS] ready');
    } catch (e) {
        console.error('[HS] error', e);
    }
});