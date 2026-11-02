import { eventSource, event_types, saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

console.log('%c[HS] START', 'color: #ff4d6d; font-weight: bold; font-size: 14px');

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
                { name: 'Полная синхронизация', threshold: 95, done: false }
            ]
        };
    }
    return extension_settings[EXT];
}

function save() {
    try { saveSettingsDebounced(); } catch (e) {}
}

// ===== СТИЛИ =====
function injectStyles() {
    if (document.getElementById('hs-css')) return;

    const s = document.createElement('style');
    s.id = 'hs-css';
    s.textContent = `
#hs-widget {
    position: fixed !important;
    top: 120px !important;
    left: 20px !important;
    width: 78px !important;
    height: 78px !important;
    z-index: 2147483647 !important;
    background: #1a0a10 !important;
    border: 3px solid #ff4d6d !important;
    border-radius: 50% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 20px !important;
    font-weight: 900 !important;
    color: #ff6b8a !important;
    font-family: monospace !important;
    box-shadow: 0 0 25px rgba(255, 60, 90, 0.7) !important;
    cursor: pointer !important;
    user-select: none !important;
    touch-action: none !important;
    pointer-events: auto !important;
}

#hs-overlay {
    position: fixed !important;
    inset: 0 !important;
    background: rgba(0,0,0,0.75) !important;
    z-index: 2147483646 !important;
    display: none !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 20px !important;
}
#hs-overlay.show {
    display: flex !important;
}

#hs-panel {
    width: min(300px, 90vw) !important;
    background: #1a1218 !important;
    border: 2px solid #ff4d6d !important;
    border-radius: 16px !important;
    padding: 18px !important;
    color: #eee !important;
    font-family: system-ui, sans-serif !important;
}
.hs-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 700;
    color: #ff6b8a;
    margin-bottom: 14px;
    font-size: 17px;
}
.hs-x {
    background: none;
    border: none;
    color: #aaa;
    font-size: 24px;
    cursor: pointer;
}
.hs-score {
    font-size: 34px;
    font-weight: 900;
    color: #ff6b8a;
    margin-bottom: 8px;
}
.hs-btn {
    width: 100%;
    margin-top: 16px;
    padding: 13px;
    border: none;
    border-radius: 12px;
    background: #ff4d6d;
    color: white;
    font-weight: 700;
    font-size: 15px;
    cursor: pointer;
}
.hs-btn.on {
    background: #2a9d8f;
}
.hs-line {
    display: flex;
    justify-content: space-between;
    padding: 7px 0;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    font-size: 14px;
}
`;
    document.head.appendChild(s);
    console.log('[HS] styles injected');
}

// ===== ВИДЖЕТ =====
function createWidget() {
    // Удаляем старый, если есть
    const old = document.getElementById('hs-widget');
    if (old) old.remove();

    const w = document.createElement('div');
    w.id = 'hs-widget';
    w.textContent = (cfg().score || 45) + '%';
    document.body.appendChild(w);

    console.log('[HS] widget created and added to body');

    // Двойной тап
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

    // Простое перетаскивание
    let dragging = false, startX, startY;
    w.addEventListener('pointerdown', e => {
        dragging = true;
        startX = e.clientX - w.offsetLeft;
        startY = e.clientY - w.offsetTop;
        w.setPointerCapture(e.pointerId);
    });
    w.addEventListener('pointermove', e => {
        if (!dragging) return;
        w.style.left = (e.clientX - startX) + 'px';
        w.style.top = (e.clientY - startY) + 'px';
        w.style.right = 'auto';
        w.style.bottom = 'auto';
    });
    w.addEventListener('pointerup', () => {
        dragging = false;
    });
}

function updateWidget() {
    const w = document.getElementById('hs-widget');
    if (w) w.textContent = (cfg().score || 0) + '%';
}

// ===== ПАНЕЛЬ =====
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
        save();
        try { toastr.success('Сенсоры включены'); } catch (e) {}
        openPanel();
    };

    ov.classList.add('show');
}

function closePanel() {
    const ov = document.getElementById('hs-overlay');
    if (ov) ov.classList.remove('show');
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
    console.log('[HS] wand added');
    return true;
}

// ===== ЗАПУСК =====
function start() {
    console.log('[HS] start() called');
    try {
        injectStyles();
        createWidget();
        updateWidget();

        if (!addWand()) {
            let tries = 0;
            const t = setInterval(() => {
                if (addWand() || ++tries > 50) clearInterval(t);
            }, 200);
        }

        // Парсер
        if (event_types && event_types.MESSAGE_RECEIVED) {
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

        console.log('%c[HS] READY', 'color: #00ff88; font-weight: bold');
    } catch (e) {
        console.error('[HS] ERROR', e);
        try { toastr.error('HS Error: ' + e.message); } catch (err) {}
    }
}

// Запускаем несколькими способами
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
} else {
    start();
}

if (typeof jQuery !== 'undefined') {
    jQuery(start);
}

// На всякий случай ещё раз через 1.5 секунды
setTimeout(start, 1500);