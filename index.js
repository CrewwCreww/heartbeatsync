(function () {
    'use strict';

    console.log('[HS] raw start');

    // Пытаемся получить нужные вещи максимально безопасно
    let eventSource, event_types, extension_settings, saveSettingsDebounced;

    try {
        // Обычный путь для расширений ST
        const scriptMod = require('../../../../script.js');
        eventSource = scriptMod.eventSource;
        event_types = scriptMod.event_types;
        saveSettingsDebounced = scriptMod.saveSettingsDebounced;
    } catch (e) {
        console.warn('[HS] script.js import failed', e);
    }

    try {
        const extMod = require('../../../extensions.js');
        extension_settings = extMod.extension_settings;
    } catch (e) {
        console.warn('[HS] extensions.js import failed', e);
        extension_settings = window.extension_settings || {};
    }

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
        try {
            if (typeof saveSettingsDebounced === 'function') saveSettingsDebounced();
        } catch (e) {}
    }

    // ========== СТИЛИ ==========
    function injectStyles() {
        if (document.getElementById('hs-css')) return;

        const s = document.createElement('style');
        s.id = 'hs-css';
        s.textContent = `
#hs-widget {
    position: fixed !important;
    bottom: 140px !important;
    right: 16px !important;
    width: 70px !important;
    height: 70px !important;
    z-index: 2147483647 !important;
    background: #2a0a12 !important;
    border: 2px solid #ff4d6d !important;
    border-radius: 50% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 18px !important;
    font-weight: 800 !important;
    color: #ff6b8a !important;
    font-family: monospace !important;
    box-shadow: 0 0 18px rgba(255, 60, 90, 0.55) !important;
    cursor: pointer !important;
    user-select: none !important;
    touch-action: none !important;
    pointer-events: auto !important;
}
#hs-overlay {
    position: fixed !important;
    inset: 0 !important;
    background: rgba(0,0,0,0.7) !important;
    z-index: 2147483646 !important;
    display: none !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 16px !important;
}
#hs-overlay.show { display: flex !important; }
#hs-panel {
    width: min(300px, 92vw) !important;
    background: #1a1218 !important;
    border: 1px solid #ff4d6d !important;
    border-radius: 14px !important;
    padding: 16px !important;
    color: #eee !important;
    font-family: system-ui, sans-serif !important;
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
    margin-top: 14px;
    padding: 12px;
    border: none;
    border-radius: 10px;
    background: #ff4d6d;
    color: white;
    font-weight: 700;
    cursor: pointer;
}
.hs-btn.on { background: #2a9d8f; }
.hs-line {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    font-size: 14px;
}
`;
        document.head.appendChild(s);
        console.log('[HS] styles ok');
    }

    // ========== ВИДЖЕТ ==========
    function createWidget() {
        if (document.getElementById('hs-widget')) {
            console.log('[HS] widget already exists');
            return;
        }

        const w = document.createElement('div');
        w.id = 'hs-widget';
        w.textContent = (cfg().score || 45) + '%';
        document.body.appendChild(w);
        console.log('[HS] widget appended to body');

        // двойной тап
        let last = 0;
        w.addEventListener('pointerup', function () {
            const now = Date.now();
            if (now - last < 300) {
                openPanel();
                last = 0;
            } else {
                last = now;
            }
        });
    }

    function updateWidget() {
        const w = document.getElementById('hs-widget');
        if (w) w.textContent = (cfg().score || 0) + '%';
    }

    // ========== ПАНЕЛЬ ==========
    function openPanel() {
        let ov = document.getElementById('hs-overlay');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'hs-overlay';
            ov.innerHTML = '<div id="hs-panel"></div>';
            document.body.appendChild(ov);
            ov.addEventListener('click', function (e) {
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
            <div style="font-size:28px;font-weight:800;color:#ff6b8a;margin-bottom:10px">${c.score}%</div>
            ${(c.milestones || []).map(m => `
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
        document.getElementById('hs-act').onclick = function () {
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

    // ========== WAND ==========
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
        console.log('[HS] wand added');
        return true;
    }

    // ========== ЗАПУСК ==========
    function start() {
        console.log('[HS] start()');
        try {
            injectStyles();
            createWidget();
            updateWidget();

            if (!addWand()) {
                let tries = 0;
                const t = setInterval(function () {
                    if (addWand() || ++tries > 40) clearInterval(t);
                }, 250);
            }

            // простой парсер
            if (eventSource && event_types && event_types.MESSAGE_RECEIVED) {
                eventSource.on(event_types.MESSAGE_RECEIVED, function () {
                    setTimeout(function () {
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
            console.error('[HS] start error', e);
        }
    }

    // Ждём DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

    // На всякий случай ещё через jQuery, если он есть
    if (typeof jQuery !== 'undefined') {
        jQuery(start);
    }

})();