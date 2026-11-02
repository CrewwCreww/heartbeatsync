import { cfg, save } from './config.js';
import { refreshWidget } from './heart.js';

export function injectStyles() {
    if (document.getElementById('hs-styles')) return;
    const el = document.createElement('style');
    el.id = 'hs-styles';
    el.textContent = `
#hs-widget {
    position: fixed;
    top: 110px;
    left: 16px;
    width: 86px;
    height: 98px;
    z-index: 999999;
    cursor: grab;
    user-select: none;
    touch-action: none;
    filter: drop-shadow(0 6px 16px rgba(200,30,50,0.4));
}
#hs-widget:active { cursor: grabbing; }
#hs-widget.hs-flash { animation: hsFlash 0.65s ease; }
@keyframes hsFlash {
    0% { filter: brightness(1); transform: scale(1); }
    40% { filter: brightness(1.7) drop-shadow(0 0 22px #ff4d6d); transform: scale(1.14); }
    100% { filter: brightness(1); transform: scale(1); }
}
.hs-beat { animation: hsBeat var(--spd, 1.1s) ease-in-out infinite; transform-origin: center; }
@keyframes hsBeat {
    0%,100% { transform: scale(1); }
    14% { transform: scale(1.07); }
    28% { transform: scale(1); }
    42% { transform: scale(1.04); }
    56% { transform: scale(1); }
}
.hs-ecg { animation: hsEcg 1.35s linear infinite; }
@keyframes hsEcg { to { stroke-dashoffset: -28; } }

#hs-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.65);
    z-index: 1000000;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 16px;
}
#hs-overlay.show { display: flex; }

#hs-panel {
    width: min(340px, 94vw);
    max-height: 80vh;
    overflow-y: auto;
    background: rgba(16,10,14,0.96);
    border: 1px solid rgba(255,70,100,0.35);
    border-radius: 16px;
    padding: 16px;
    color: #eee;
    font-family: system-ui, sans-serif;
}
.hs-title {
    display: flex; justify-content: space-between; align-items: center;
    font-weight: 700; font-size: 16px; color: #ff6b8a; margin-bottom: 12px;
}
.hs-x { background: none; border: none; color: #aaa; font-size: 22px; cursor: pointer; }
.hs-score { font-size: 32px; font-weight: 800; color: #ff6b8a; margin-bottom: 4px; }
.hs-sub { font-size: 12px; opacity: 0.6; margin-bottom: 12px; }
.hs-sec { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.45; margin: 12px 0 6px; }
.hs-line { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.07); }
.hs-line.done { opacity: 0.4; text-decoration: line-through; }
.hs-btn {
    width: 100%; margin-top: 14px; padding: 11px; border: none; border-radius: 10px;
    background: linear-gradient(135deg, #ff4d6d, #c9184a); color: white; font-weight: 700; cursor: pointer;
}
.hs-btn.on { background: linear-gradient(135deg, #2a9d8f, #1a6b63); }
`;
    document.head.appendChild(el);
}

export function openPanel() {
    let ov = document.getElementById('hs-overlay');
    if (!ov) {
        ov = document.createElement('div');
        ov.id = 'hs-overlay';
        ov.innerHTML = '<div id="hs-panel"></div>';
        document.body.appendChild(ov);
        ov.addEventListener('click', e => { if (e.target === ov) closePanel(); });
    }

    const c = cfg();
    const p = document.getElementById('hs-panel');
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
            </div>
        `).join('')}
        ${c.npcs.length ? `
            <div class="hs-sec">Другие связи</div>
            ${c.npcs.map(n => `
                <div class="hs-line"><span>\( {n.name}</span><span> \){n.score}%</span></div>
            `).join('')}
        ` : ''}
        <button class="hs-btn ${c.sensorsActive ? 'on' : ''}" id="hs-act">
            ${c.sensorsActive ? 'Sensors Active' : 'Activate Sensors'}
        </button>
    `;

    document.getElementById('hs-close').onclick = closePanel;
    document.getElementById('hs-act').onclick = () => {
        c.sensorsActive = true;
        save();
        try { toastr.success('Сенсоры включены. Теги будут вырезаться из контекста.'); } catch {}
        openPanel();
    };

    ov.classList.add('show');
}

export function closePanel() {
    document.getElementById('hs-overlay')?.classList.remove('show');
}