import { eventSource, event_types, saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

const EXT = 'heartbeat-sync';

const defaults = {
    score: 40,
    relationType: 'neutral',
    sensorsActive: false,
    widgetPos: null,
    milestones: [
        { name: 'Первый контакт', threshold: 15, done: false },
        { name: 'Доверие', threshold: 35, done: false },
        { name: 'Признание', threshold: 60, done: false },
        { name: 'Поцелуй', threshold: 75, done: false },
        { name: 'Полная синхронизация', threshold: 95, done: false },
    ],
    npcs: []
};

function cfg() {
    if (!extension_settings[EXT]) extension_settings[EXT] = structuredClone(defaults);
    const c = extension_settings[EXT];
    for (const k in defaults) if (c[k] === undefined) c[k] = structuredClone(defaults[k]);
    return c;
}
function save() { saveSettingsDebounced(); }

// ====================== СТИЛИ ======================
function injectStyles() {
    if (document.getElementById('hs-css')) return;
    const s = document.createElement('style');
    s.id = 'hs-css';
    s.textContent = `
#hs-widget{
    position:fixed; bottom:110px; right:14px;
    width:84px; height:96px; z-index:999999;
    cursor:grab; user-select:none; touch-action:none;
    filter:drop-shadow(0 6px 16px rgba(200,30,50,.45));
}
#hs-widget:active{cursor:grabbing;}
#hs-widget.flash{animation:hsFlash .6s ease;}
@keyframes hsFlash{
    0%{filter:brightness(1);transform:scale(1)}
    40%{filter:brightness(1.8) drop-shadow(0 0 24px #ff4d6d);transform:scale(1.16)}
    100%{filter:brightness(1);transform:scale(1)}
}
.hs-beat{animation:hsBeat var(--spd,1.1s) ease-in-out infinite;transform-origin:center}
@keyframes hsBeat{
    0%,100%{transform:scale(1)}
    14%{transform:scale(1.09)}
    28%{transform:scale(1)}
    42%{transform:scale(1.05)}
    56%{transform:scale(1)}
}
.hs-ecg{fill:none;stroke-linecap:round;stroke-dasharray:5 3;animation:ecg 1.3s linear infinite}
@keyframes ecg{to{stroke-dashoffset:-28}}

#hs-overlay{
    position:fixed;inset:0;background:rgba(0,0,0,.6);
    z-index:1000000;display:none;align-items:center;justify-content:center;padding:12px;
}
#hs-overlay.show{display:flex;}
#hs-panel{
    width:min(340px,94vw);max-height:80vh;overflow-y:auto;
    background:rgba(14,10,16,.96);backdrop-filter:blur(16px);
    border:1px solid rgba(255,70,100,.3);border-radius:16px;
    padding:16px;color:#eee;font-family:system-ui,sans-serif;
}
.hs-title{display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:17px;color:#ff6b8a;margin-bottom:12px}
.hs-x{background:0;border:0;color:#aaa;font-size:24px;cursor:pointer;line-height:1}
.hs-score{font-size:34px;font-weight:800;color:#ff6b8a}
.hs-sub{font-size:12px;opacity:.6;margin-bottom:12px}
.hs-sec{font-size:11px;text-transform:uppercase;letter-spacing:.5px;opacity:.45;margin:12px 0 6px}
.hs-line{display:flex;justify-content:space-between;padding:5px 0;font-size:14px;border-bottom:1px solid rgba(255,255,255,.07)}
.hs-line.done{opacity:.4;text-decoration:line-through}
.hs-btn{
    width:100%;margin-top:14px;padding:11px;border:0;border-radius:10px;
    font-weight:700;font-size:14px;cursor:pointer;
    background:linear-gradient(135deg,#ff4d6d,#c9184a);color:#fff
}
.hs-btn.on{background:linear-gradient(135deg,#2a9d8f,#1a6b63)}
`;
    document.head.appendChild(s);
}

// ====================== СЕРДЦЕ ======================
function visual(score) {
    const s = Math.max(0, Math.min(100, score));
    if (s <= 20) return { h: 210, sat: 28, l: 36, spd: 1.55 };
    if (s <= 50) return { h: 0, sat: 58, l: 40, spd: 1.15 };
    if (s <= 80) return { h: 350, sat: 80, l: 48, spd: 0.82 };
    return { h: 0, sat: 95, l: 52, spd: 0.52 };
}

function buildHeart(score) {
    const v = visual(score);
    const fill = `hsl(\( {v.h}, \){v.sat}%,${v.l}%)`;
    const line = `hsl(\( {v.h}, \){Math.min(100, v.sat + 12)}%,${Math.min(68, v.l + 14)}%)`;
    const h = (score / 100) * 80;

    return `<svg class="hs-beat" style="--spd:${v.spd}s" viewBox="0 0 100 110" width="100%" height="100%">
  <defs>
    <clipPath id="c"><path d="M50 94C50 94 15 69 15 43C15 27 27 15 42 15C47 15 50 19 50 19S53 15 58 15C73 15 85 27 85 43C85 69 50 94 50 94Z"/></clipPath>
  </defs>
  <path d="M50 94C50 94 15 69 15 43C15 27 27 15 42 15C47 15 50 19 50 19S53 15 58 15C73 15 85 27 85 43C85 69 50 94 50 94Z"
        fill="rgba(14,8,12,.82)" stroke="rgba(255,80,110,.4)" stroke-width="1.7"/>
  <rect x="0" y="\( {94 - h}" width="100" height=" \){h}" clip-path="url(#c)" fill="${fill}" opacity=".85"/>
  <g fill="none" stroke="${line}" stroke-width="1.1" opacity=".9">
    <path d="M37 36Q45 47 42 60"/><path d="M63 34Q55 48 58 62"/>
    <path d="M50 26Q48 43 50 67"/><path d="M33 50Q41 56 48 53"/>
    <path d="M67 48Q59 56 52 54"/>
  </g>
  <polyline class="hs-ecg" points="20,75 29,75 33,65 37,85 41,75 54,75 58,67 62,83 66,75 80,75"
            stroke="${line}" stroke-width="1.3"/>
  <text x="50" y="50" text-anchor="middle" fill="#fff" font-size="16" font-weight="700" font-family="monospace">${Math.round(score)}</text>
  <text x="50" y="61" text-anchor="middle" fill="rgba(255,255,255,.7)" font-size="8" font-family="monospace">%</text>
</svg>`;
}

function updateHeart() {
    const c = cfg();
    let w = document.getElementById('hs-widget');
    if (!w) {
        w = document.createElement('div');
        w.id = 'hs-widget';
        document.body.appendChild(w);
        makeInteractive(w);
    }
    w.innerHTML = buildHeart(c.score);

    if (c.widgetPos?.top) {
        w.style.top = c.widgetPos.top;
        w.style.left = c.widgetPos.left;
        w.style.right = w.style.bottom = 'auto';
    }
}

function flash() {
    const w = document.getElementById('hs-widget');
    if (!w) return;
    w.classList.remove('flash');
    void w.offsetWidth;
    w.classList.add('flash');
}

// ====================== ПЕРЕТАСКИВАНИЕ + ДВОЙНОЙ ТАП ======================
function makeInteractive(el) {
    let drag = false, moved = false, ox = 0, oy = 0, last = 0;

    el.addEventListener('pointerdown', e => {
        const r = el.getBoundingClientRect();
        ox = e.clientX - r.left;
        oy = e.clientY - r.top;
        drag = true; moved = false;
        el.setPointerCapture(e.pointerId);
        e.preventDefault();
    });
    el.addEventListener('pointermove', e => {
        if (!drag) return;
        if (Math.abs(e.movementX) > 3 || Math.abs(e.movementY) > 3) moved = true;
        if (!moved) return;
        el.style.left = Math.max(4, Math.min(innerWidth - 90, e.clientX - ox)) + 'px';
        el.style.top  = Math.max(4, Math.min(innerHeight - 110, e.clientY - oy)) + 'px';
        el.style.right = el.style.bottom = 'auto';
    });
    el.addEventListener('pointerup', () => {
        if (!drag) return;
        drag = false;
        if (moved) {
            cfg().widgetPos = { top: el.style.top, left: el.style.left };
            save();
            return;
        }
        const now = Date.now();
        if (now - last < 300) {
            last = 0;
            openPanel();
        } else last = now;
    });
}

// ====================== ПАРСЕР ======================
const R_SYNC = /{{HS::SYNC:(\d{1,3})}}/gi;
const R_TYPE = /{{HS::TYPE:([^}]+)}}/gi;
const R_EVENT = /{{HS::EVENT:([^}]+)}}/gi;
const R_NPC = /{{HS::NPC:([^:]+):(\d{1,3})}}/gi;

function parse(text) {
    if (!text) return;
    const c = cfg();
    let changed = false;

    const s = [...text.matchAll(R_SYNC)];
    if (s.length) {
        const v = Math.max(0, Math.min(100, +s.at(-1)[1]));
        if (v !== c.score) {
            const old = c.score;
            c.score = v;
            changed = true;
            c.milestones.forEach(m => {
                if (!m.done && c.score >= m.threshold) {
                    m.done = true;
                    flash();
                    try { toastr.success('Достижение: ' + m.name); } catch {}
                }
            });
            if (Math.abs(v - old) >= 12) flash();
        }
    }
    const t = [...text.matchAll(R_TYPE)];
    if (t.length) { c.relationType = t.at(-1)[1].trim().toLowerCase(); changed = true; }

    const e = [...text.matchAll(R_EVENT)];
    if (e.length) {
        flash();
        try { toastr.info('Событие: ' + e.at(-1)[1].trim()); } catch {}
        changed = true;
    }

    [...text.matchAll(R_NPC)].forEach(m => {
        const name = m[1].trim(), sc = +m[2];
        let n = c.npcs.find(x => x.name.toLowerCase() === name.toLowerCase());
        if (!n) c.npcs.push({ name, score: sc });
        else n.score = sc;
        changed = true;
    });

    if (changed) {
        save();
        updateHeart();
        if (document.getElementById('hs-overlay')?.classList.contains('show')) drawPanel();
    }
}

function watchChat() {
    const chat = document.getElementById('chat');
    if (!chat) return;
    new MutationObserver(ms => {
        for (const m of ms)
            for (const n of m.addedNodes) {
                if (n.nodeType !== 1) continue;
                const t = n.querySelector?.('.mes_text')?.textContent || n.textContent;
                if (t) parse(t);
            }
    }).observe(chat, { childList: true, subtree: true });
}

// ====================== ПАНЕЛЬ ======================
function openPanel() {
    let ov = document.getElementById('hs-overlay');
    if (!ov) {
        ov = document.createElement('div');
        ov.id = 'hs-overlay';
        ov.innerHTML = '<div id="hs-panel"></div>';
        document.body.appendChild(ov);
        ov.onclick = e => { if (e.target === ov) closePanel(); };
    }
    ov.classList.add('show');
    drawPanel();
}
function closePanel() {
    document.getElementById('hs-overlay')?.classList.remove('show');
}
function drawPanel() {
    const c = cfg();
    const p = document.getElementById('hs-panel');
    if (!p) return;
    p.innerHTML = `
        <div class="hs-title">
            <span>Heartbeat Sync</span>
            <button class="hs-x" id="hs-close">×</button>
        </div>
        <div class="hs-score">${c.score}%</div>
        <div class="hs-sub">${c.relationType}</div>
        <div class="hs-sec">Достижения</div>
        ${c.milestones.map(m => `
            <div class="hs-line ${m.done ? 'done' : ''}">
                <span>\( {m.name}</span><span> \){m.threshold}%</span>
            </div>`).join('')}
        ${c.npcs.length ? `<div class="hs-sec">Другие связи</div>
            \( {c.npcs.map(n => `<div class="hs-line"><span> \){n.name}</span><span>${n.score}%</span></div>`).join('')}` : ''}
        <button class="hs-btn ${c.sensorsActive ? 'on' : ''}" id="hs-act">
            ${c.sensorsActive ? 'Sensors Active' : 'Activate Sensors'}
        </button>`;
    document.getElementById('hs-close').onclick = closePanel;
    document.getElementById('hs-act').onclick = () => {
        c.sensorsActive = true;
        save();
        watchChat();
        try { toastr.success('Сенсоры включены'); } catch {}
        drawPanel();
    };
}

// ====================== ИНЪЕКЦИЯ ======================
const INSTR = `You are under Heartbeat Sync protocol.
At the VERY END of every reply add:
{{HS::SYNC:XX}}
Optional: {{HS::TYPE:romance}} {{HS::EVENT:name}} {{HS::NPC:Name:45}}
Only at the end. No explanations.`;

function inject(data) {
    if (!cfg().sensorsActive) return;
    try {
        if (data?.chat && Array.isArray(data.chat)) {
            data.chat = data.chat.filter(m => !m._hs);
            data.chat.push({ role: 'system', content: INSTR, _hs: true });
        }
        if (data?.prompt && typeof data.prompt === 'string' && !data.prompt.includes('Heartbeat Sync protocol')) {
            data.prompt += '\n\n' + INSTR;
        }
    } catch {}
}

// ====================== WAND ======================
function addWand() {
    if (document.getElementById('hs-wand')) return true;
    const menu = document.getElementById('extensionsMenu');
    if (!menu) return false;
    const i = document.createElement('div');
    i.id = 'hs-wand';
    i.className = 'list-group-item flex-container flexGap5 interactable';
    i.innerHTML = '<i class="fa-solid fa-heart-pulse" style="color:#ff4d6d"></i><span>Heartbeat Sync</span>';
    i.onclick = openPanel;
    menu.appendChild(i);
    return true;
}

// ====================== START ======================
jQuery(() => {
    try {
        injectStyles();
        updateHeart();

        if (!addWand()) {
            let n = 0;
            const t = setInterval(() => { if (addWand() || ++n > 30) clearInterval(t); }, 250);
        }

        if (event_types?.CHAT_COMPLETION_PROMPT_READY)
            eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, inject);
        if (event_types?.GENERATE_AFTER_COMBINING_PROMPTS)
            eventSource.on(event_types.GENERATE_AFTER_COMBINING_PROMPTS, inject);

        if (event_types?.MESSAGE_RECEIVED)
            eventSource.on(event_types.MESSAGE_RECEIVED, () => {
                setTimeout(() => {
                    const last = document.querySelector('#chat .mes:last-child .mes_text');
                    if (last) parse(last.textContent);
                }, 280);
            });

        if (cfg().sensorsActive) watchChat();
        console.log('[Heartbeat Sync] ready');
    } catch (e) {
        console.error(e);
    }
});