import { cfg, save } from './config.js';
import { refreshWidget } from './heart.js';

export function injectStyles() {
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
    background: rgba(25, 8, 14, 0.92);
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
    margin-bottom: 8px;
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

export function openPanel() {
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
        save();
        try { toastr.success('Сенсоры включены'); } catch {}
        openPanel();
    };

    ov.classList.add('show');
}

export function closePanel() {
    document.getElementById('hs-overlay')?.classList.remove('show');
}