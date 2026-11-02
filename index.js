import { eventSource, event_types } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

const EXT_NAME = 'heartbeat-sync';

const defaultSettings = {
    isEnabled: true,
    score: 50,
    widgetSize: 70,
};

function cfg() {
    if (!extension_settings[EXT_NAME]) {
        extension_settings[EXT_NAME] = structuredClone(defaultSettings);
    }
    return extension_settings[EXT_NAME];
}

// ===================== СТИЛИ =====================
function injectStyles() {
    if (document.getElementById('hs-styles')) return;

    const el = document.createElement('style');
    el.id = 'hs-styles';
    el.textContent = `
#hs-widget {
    position: fixed;
    bottom: 110px;
    right: 18px;
    width: 78px;
    z-index: 999999;
    cursor: grab;
    user-select: none;
    touch-action: none;
    filter: drop-shadow(0 4px 14px rgba(255, 60, 90, 0.35));
    transition: filter 0.25s ease, transform 0.3s ease;
    pointer-events: auto;
}
#hs-widget:active { cursor: grabbing; }

.hs-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 8px 8px;
    background: rgba(18, 14, 22, 0.72);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.09);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.4);
}

.hs-ecg {
    width: 64px;
    height: 18px;
    overflow: hidden;
    opacity: 0.9;
}
.hs-ecg svg { width: 100%; height: 100%; }
.hs-ecg-line {
    fill: none;
    stroke: hsl(var(--hs-hue, 0), 85%, 62%);
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-dasharray: 5 3;
    animation: hs-ecg 1.3s linear infinite;
    filter: drop-shadow(0 0 3px hsla(var(--hs-hue, 0), 100%, 60%, 0.6));
}
@keyframes hs-ecg {
    to { stroke-dashoffset: -32; }
}

.hs-heart {
    width: 44px;
    height: 40px;
    fill: hsl(var(--hs-hue, 0), 82%, 58%);
    animation: hs-beat var(--hs-speed, 0.9s) ease-in-out infinite;
    transition: fill 0.4s ease;
    filter: drop-shadow(0 0 6px hsla(var(--hs-hue, 0), 100%, 60%, 0.55));
}
@keyframes hs-beat {
    0%, 100% { transform: scale(1); }
    14% { transform: scale(1.16); }
    28% { transform: scale(1); }
    42% { transform: scale(1.1); }
    56% { transform: scale(1); }
}

#hs-percent {
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    text-shadow: 0 1px 4px rgba(0,0,0,0.6);
    letter-spacing: 0.3px;
}

.hs-btn {
    margin-top: 3px;
    padding: 4px 9px;
    font-size: 11px;
    font-weight: 600;
    border: none;
    border-radius: 20px;
    background: linear-gradient(135deg, #ff4d6d, #c9184a);
    color: white;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(201, 24, 74, 0.4);
    white-space: nowrap;
}
.hs-btn.active {
    background: linear-gradient(135deg, #2a9d8f, #1d6f66);
}

@media (max-width: 600px) {
    #hs-widget {
        bottom: 95px;
        right: 12px;
        transform: scale(0.92);
        transform-origin: bottom right;
    }
}
`;
    document.head.appendChild(el);
}

// ===================== ВИДЖЕТ =====================
function updateVisual(score) {
    const clamped = Math.max(0, Math.min(100, Math.round(score)));
    let hue = 200;
    if (clamped >= 60) hue = 340;
    else if (clamped >= 30) hue = 0;

    document.documentElement.style.setProperty('--hs-hue', hue);
    document.documentElement.style.setProperty('--hs-speed', `${Math.max(0.5, 1.25 - clamped / 110)}s`);

    const percentEl = document.getElementById('hs-percent');
    if (percentEl) percentEl.textContent = clamped + '%';
}

function createWidget() {
    if (document.getElementById('hs-widget')) return;

    const w = document.createElement('div');
    w.id = 'hs-widget';
    w.innerHTML = `
        <div class="hs-container">
            <div class="hs-ecg">
                <svg viewBox="0 0 100 30" preserveAspectRatio="none">
                    <polyline class="hs-ecg-line" points="0,15 12,15 18,4 24,26 30,15 48,15 54,7 60,23 66,15 82,15 88,3 94,27 100,15"/>
                </svg>
            </div>
            <svg class="hs-heart" viewBox="0 0 32 29">
                <path d="M16 28 C16 28 2 18 2 10 C2 5 6 1 11 1 C13.5 1 15.5 2.5 16 4.5 C16.5 2.5 18.5 1 21 1 C26 1 30 5 30 10 C30 18 16 28 16 28 Z"/>
            </svg>
            <span id="hs-percent">50%</span>
            <button id="hs-activate" class="hs-btn">Activate</button>
        </div>
    `;
    document.body.appendChild(w);

    document.getElementById('hs-activate').addEventListener('click', () => {
        const btn = document.getElementById('hs-activate');
        btn.textContent = 'Active';
        btn.classList.add('active');
        try { toastr?.success?.('Heartbeat Sync активирован. Теги {{HS::SYNC:XX}} будут ловиться.'); } catch {}
        startObserver();
    });

    makeDraggable(w);
    updateVisual(cfg().score || 50);
}

function makeDraggable(el) {
    let drag = false, ox = 0, oy = 0;
    el.addEventListener('pointerdown', e => {
        if (e.target.closest('button')) return;
        const r = el.getBoundingClientRect();
        ox = e.clientX - r.left;
        oy = e.clientY - r.top;
        drag = true;
        el.setPointerCapture(e.pointerId);
        e.preventDefault();
    });
    el.addEventListener('pointermove', e => {
        if (!drag) return;
        el.style.left = Math.max(8, e.clientX - ox) + 'px';
        el.style.top  = Math.max(8, e.clientY - oy) + 'px';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
    });
    el.addEventListener('pointerup', () => { drag = false; });
}

// ===================== ПАРСЕР =====================
const TAG_SYNC = /{{HS::SYNC:(\d{1,3})}}/gi;

function parseText(text) {
    if (!text) return;
    const matches = [...text.matchAll(TAG_SYNC)];
    if (matches.length === 0) return;

    const last = matches[matches.length - 1];
    const score = parseInt(last[1], 10);
    if (isNaN(score)) return;

    cfg().score = Math.max(0, Math.min(100, score));
    updateVisual(cfg().score);
}

function startObserver() {
    const chat = document.getElementById('chat');
    if (!chat) return;

    const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (node.nodeType !== 1) continue;
                const textEl = node.querySelector?.('.mes_text') || node;
                if (textEl?.textContent) parseText(textEl.textContent);
            }
        }
    });

    observer.observe(chat, { childList: true, subtree: true });
}

// ===================== ИНИЦИАЛИЗАЦИЯ =====================
jQuery(() => {
    try {
        injectStyles();
        createWidget();

        if (event_types?.MESSAGE_RECEIVED) {
            eventSource.on(event_types.MESSAGE_RECEIVED, () => {
                setTimeout(() => {
                    const last = document.querySelector('#chat .mes:last-child .mes_text');
                    if (last) parseText(last.textContent);
                }, 300);
            });
        }

        console.log('[Heartbeat Sync] loaded');
    } catch (e) {
        console.error('[Heartbeat Sync] init error', e);
        try { toastr?.error?.('Heartbeat Sync: ошибка инициализации — ' + e.message); } catch {}
    }
});