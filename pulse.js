import { cfg, save } from './config.js';

export function createWidget(onActivate) {
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
            save();
            return;
        }

        const now = Date.now();
        if (now - lastTap < 300) {
            lastTap = 0;
            if (typeof onActivate === 'function') onActivate();
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

export function refreshWidget() {
    const w = document.getElementById('hs-widget');
    if (w) w.textContent = cfg().score + '%';
}