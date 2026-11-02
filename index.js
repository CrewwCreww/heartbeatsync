import { eventSource, event_types } from '../../../../script.js';
import { EXT_NAME, defaultSettings, cfg, save } from './config.js';
import { injectStyles, openPanel } from './ui.js';
import { createWidget, refreshWidget } from './heart.js';

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

jQuery(() => {
    try {
        // инициализация настроек
        const c = cfg();
        for (const [k, v] of Object.entries(defaultSettings)) {
            if (c[k] === undefined) c[k] = structuredClone(v);
        }

        injectStyles();
        createWidget(openPanel);
        refreshWidget();

        // wand
        if (!registerWand()) {
            let tries = 0;
            const iv = setInterval(() => {
                if (registerWand() || ++tries > 40) clearInterval(iv);
            }, 250);
        }

        // парсер тегов
        if (event_types?.MESSAGE_RECEIVED) {
            eventSource.on(event_types.MESSAGE_RECEIVED, () => {
                setTimeout(() => {
                    const el = document.querySelector('#chat .mes:last-child .mes_text');
                    if (!el) return;
                    const m = el.textContent.match(/{{HS::SYNC:(\d{1,3})}}/i);
                    if (m) {
                        cfg().score = Math.min(100, parseInt(m[1], 10));
                        save();
                        refreshWidget();
                    }
                }, 350);
            });
        }

        console.log('[Heartbeat Sync] loaded');
    } catch (e) {
        console.error('[Heartbeat Sync]', e);
        try { toastr.error('Heartbeat Sync: ' + e.message); } catch {}
    }
});