import { eventSource, event_types, saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

console.log('[HS] loading v3.1');

const EXT = 'heartbeat-sync';

function cfg() {
    if (!extension_settings[EXT]) {
        extension_settings[EXT] = {
            score: 42,
            sensorsActive: false,
            widgetPos: null,
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

// ===================== СТИЛИ =====================
function injectStyles() {
    if (document.getElementById('hs-css')) return;

    const s = document.createElement('style');
    s.id = 'hs-css';
    s.textContent = `
#hs-widget {
    position: fixed !important;
    top: 120px !important;
    left: 18px !important;
    width: 84px !important;
    height: 96px !important;
    z-index: 999999 !important;
    cursor: grab !important;
    user-select: none !important;
    touch-action: none !important;
    filter: drop-shadow(0 6px 18px rgba(200, 30, 50, 0.45));
}
#hs-widget:active {
    cursor: grabbing !important;
}
#hs-widget.hs-flash {
    animation: hsFlash 0.6s ease;
}
@keyframes hsFlash {
    0% { filter: brightness(1); transform: scale(1); }
    40% { filter: brightness(1.6) drop-shadow(0 0 22px #ff4d6d); transform: scale(1.12); }
    100% { filter: brightness(1); transform: scale(1); }
}
.hs-beat {
    animation: hsBeat var(--spd, 1.1s) ease-in-out infinite;
    transform-origin: center;
}
@keyframes hsBeat {
    0%, 100% { transform: scale(1); }
    15% { transform: scale(1.06); }
    30% { transform: scale(1); }
    45% { transform: scale(1.03); }
    60% { transform: scale(1); }
}
.hs-ecg {
    animation: hsEcg 1.3s linear infinite;
}
@keyframes hsEcg {
    to { stroke-dashoffset: -28; }
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
    width: min(320px, 92vw) !important;
    max-height: 80vh !important;
    overflow-y: auto !important;
    background: rgba(16, 10, 14, 0.97) !important;
    border: 1px solid rgba(255, 70, 100, 0.4) !important;
    border-radius: 16px !important;
    padding: 16px !important;
    color: #eee !important;
    font-family: system-ui, sans-serif !important;
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
    line-height: 1;
}
.hs-score {
    font-size: 32px;
    font-weight: 800;
    color: #ff6b8a;
    margin-bottom: 4px;
}
.hs-sub {
    font-size: 12px;
    opacity: 0.6;
    margin-bottom: 14px;
}
.hs-sec {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.45;
    margin: 12px 0 6px;
}
.hs-line {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 14px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
}
.hs-line.done {
    opacity: 0.4;
    text-decoration: line-through;
}
.hs-btn {
    width: 100%;
    margin-top: 16px;
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
`;
    document.head.appendChild(s);
}

// ===================== СЕРДЦЕ =====================
function visual(score) {
    const s = Math.max(0, Math.min(100, score));
    if (s <= 20) return { h: 210, sat: 28, l: 36, spd: 1.5 };
    if (s <= 50) return { h: 0, sat: 58, l: 40, spd: 1.1 };
    if (s <= 80) return { h: 350, sat: 80, l: 48, spd: 0.8 };
    return { h: 0, sat: 95, l: 52, spd: 0.55 };
}

function buildHeart(score) {
    const v = visual(score);
    const fill = `hsl(${v.h}, ${v.sat}%, ${v.l}%)`;
    const vessel = `hsl(${v.h}, ${Math.min(100, v.sat + 12)}%, ${Math.min(68, v.l + 14)}%)`;
    const fillH = (score / 100) * 82;

    return `
<svg viewBox="0 0 100 112" width="100%" height="100%" class="hs-beat" style="--spd:${v.spd}s">
  <defs>
    <clipPath id="hsclip">
      <path d="M50 96 C50 96 14 70 14 42 C14 25 27 13 42 13 C47 13 50 17 50 17 C50 17 53 13 58 13 C73 13 86 25 86 42 C86 70 50 96 50 96 Z"/>
    </clipPath>
    <linearGradient id="hsglass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.2)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.15)"/>
    </linearGradient>
  </defs>

  <path d="M50 96 C50 96 14 70 14 42 C14 25 27 13 42 13 C47 13 50 17 50 17 C50 17 53 13 58 13 C73 13 86 25 86 42 C86 70 50 96 50 96 Z"
        fill="rgba(14,8,12,0.85)" stroke="rgba(255,80,110,0.45)" stroke-width="1.8"/>

  <rect x="0" y="\( {96 - fillH}" width="100" height=" \){fillH}"
        clip-path="url(#hsclip)" fill="${fill}" opacity="0.88"/>

  <g fill="none" stroke="${vessel}" stroke-width="1.15" opacity="0.9">
    <path d="M37 36 Q45 48 42 62"/>
    <path d="M63 34 Q55 49 58 63"/>
    <path d="M50 26 Q48 44 50 68"/>
    <path d="M33 51 Q41 57 48 54"/>
    <path d="M67 49 Q59 57 52 55"/>
  </g>

  <path d="M50 96 C50 96 14 70 14 42 C14 25 27 13 42 13 C47 13 50 17 50 17 C50 17 53 13 58 13 C73 13 86 25 86 42 C86 70 50 96 50 96 Z"
        fill="url(#hsglass)" opacity="0.5"/>

  <polyline points="20,76 29,76 33,66 37,86 41,76 54,76 58,68 62,84 66,76 80,76"
            fill="none" stroke="${vessel}" stroke-width="1.3"
            stroke-linecap="round" stroke-dasharray="5 3" class="hs-ecg"/>

  <text x="50" y="50" text-anchor="middle" fill="#fff" font-size="16" font-weight="700" font-family="monospace">${Math.round(score)}</text>
  <text x="50" y="61" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="8" font-family="monospace">%</text>
</svg>`;
}

function createWidget() {
    let w = document.getElementById('hs-widget');
    if (w) w.remove();

    w = document.createElement('div');
    w.id = 'hs-widget';
    w.innerHTML = buildHeart(cfg().score);
    document.body.appendChild(w);

    // Перетаскивание + двойной тап
    let dragging = false;
    let moved = false;
    let startX = 0, startY = 0;
    let lastTap = 0;

    w.addEventListener('pointerdown', (e) => {
        const rect = w.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
        dragging = true;
        moved = false;
        w.setPointerCapture(e.pointerId);
        e.preventDefault();
    });

    w.addEventListener('pointermove', (e) => {
        if (!dragging) return;

        const dx = Math.abs(e.clientX - (w.getBoundingClientRect().left + startX));
        const dy = Math.abs(e.clientY - (w.getBoundingClientRect().top + startY));
        if (dx > 5 || dy > 5) moved = true;

        if (!moved) return;

        let newLeft = e.clientX - startX;
        let newTop = e.clientY - startY;

        newLeft = Math.max(4, Math.min(window.innerWidth - 90, newLeft));
        newTop = Math.max(4, Math.min(window.innerHeight - 110, newTop));

        w.style.left = newLeft + 'px';
        w.style.top = newTop + 'px';
        w.style.right = 'auto';
        w.style.bottom = 'auto';
    });

    w.addEventListener('pointerup', () => {
        if (!dragging) return;
        dragging = false;

        if (moved) {
            cfg().widgetPos = {
                top: w.style.top,
                left: w.style.left
            };
            save();
            return;
        }

        // Двойной тап
        const now = Date.now();
        if (now - lastTap < 300) {
            lastTap = 0;
            openPanel();
        } else {
            lastTap = now;
        }
    });

    // Восстановить позицию
    const pos = cfg().widgetPos;
    if (pos && pos.top) {
        w.style.top = pos.top;
        w.style.left = pos.left;
        w.style.right = 'auto';
        w.style.bottom = 'auto';
    }
}

function updateWidget() {
    const w = document.getElementById('hs-widget');
    if (w) w.innerHTML = buildHeart(cfg().score);
}

function flashWidget() {
    const w = document.getElementById('hs-widget');
    if (!w) return;
    w.classList.remove('hs-flash');
    void w.offsetWidth;
    w.classList.add('hs-flash');
}

// ===================== ПАНЕЛЬ =====================
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

    const c = cfg();
    const panel = document.getElementById('hs-panel');

    panel.innerHTML = `
        <div class="hs-title">
            <span>Heartbeat Sync</span>
            <button class="hs-x" id="hs-close">×</button>
        </div>
        <div class="hs-score">${c.score}%</div>
        <div class="hs-sub">Синхронизация</div>
        <div class="hs-sec">Достижения</div>
        ${c.milestones.map(m => `
            <div class="hs-line ${m.done ? 'done' : ''}">
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
    document.getElementById('hs-overlay')?.classList.remove('show');
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
    item.onclick = openPanel;
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
                        cfg().score = Math.min(100, parseInt(m[1], 10));
                        save();
                        updateWidget();
                    }
                }, 350);
            });
        }

        console.log('[HS] v3.1 ready');
    } catch (e) {
        console.error('[HS]', e);
    }
});