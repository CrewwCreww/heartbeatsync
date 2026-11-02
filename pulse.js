import { cfg, save } from './config.js';

function visual(score) {
    const s = Math.max(0, Math.min(100, score));
    if (s <= 20) return { h: 210, sat: 30, l: 38, spd: 1.5 };
    if (s <= 50) return { h: 0, sat: 60, l: 42, spd: 1.1 };
    if (s <= 80) return { h: 350, sat: 82, l: 50, spd: 0.8 };
    return { h: 0, sat: 95, l: 55, spd: 0.55 };
}

function buildSVG(score) {
    const v = visual(score);
    const fill = `hsl(${v.h}, ${v.sat}%, ${v.l}%)`;
    const vessel = `hsl(${v.h}, ${Math.min(100, v.sat + 10)}%, ${Math.min(70, v.l + 12)}%)`;
    const fillH = (score / 100) * 82;

    return `
<svg viewBox="0 0 100 112" width="100%" height="100%" class="hs-beat" style="--spd:${v.spd}s">
  <defs>
    <clipPath id="hsclip">
      <path d="M50 96 C50 96 14 70 14 42 C14 25 27 13 42 13 C47 13 50 17 50 17 C50 17 53 13 58 13 C73 13 86 25 86 42 C86 70 50 96 50 96 Z"/>
    </clipPath>
    <linearGradient id="hsglass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.22)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.18)"/>
    </linearGradient>
  </defs>

  <!-- корпус -->
  <path d="M50 96 C50 96 14 70 14 42 C14 25 27 13 42 13 C47 13 50 17 50 17 C50 17 53 13 58 13 C73 13 86 25 86 42 C86 70 50 96 50 96 Z"
        fill="rgba(16,8,12,0.82)" stroke="rgba(255,80,110,0.45)" stroke-width="1.8"/>

  <!-- заливка -->
  <rect x="0" y="\( {96 - fillH}" width="100" height=" \){fillH}"
        clip-path="url(#hsclip)" fill="${fill}" opacity="0.88"/>

  <!-- сосуды -->
  <g fill="none" stroke="${vessel}" stroke-width="1.15" opacity="0.9">
    <path d="M37 36 Q45 48 42 62"/>
    <path d="M63 34 Q55 49 58 63"/>
    <path d="M50 26 Q48 44 50 68"/>
    <path d="M33 51 Q41 57 48 54"/>
    <path d="M67 49 Q59 57 52 55"/>
  </g>

  <!-- стекло -->
  <path d="M50 96 C50 96 14 70 14 42 C14 25 27 13 42 13 C47 13 50 17 50 17 C50 17 53 13 58 13 C73 13 86 25 86 42 C86 70 50 96 50 96 Z"
        fill="url(#hsglass)" opacity="0.55"/>

  <!-- ЭКГ -->
  <polyline points="20,76 29,76 33,66 37,86 41,76 54,76 58,68 62,84 66,76 80,76"
            fill="none" stroke="${vessel}" stroke-width="1.35"
            stroke-linecap="round" stroke-dasharray="5 3"
            class="hs-ecg"/>

  <!-- процент внутри -->
  <text x="50" y="50" text-anchor="middle" fill="#fff" font-size="16" font-weight="700"
        font-family="monospace">${Math.round(score)}</text>
  <text x="50" y="61" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="8"
        font-family="monospace">%</text>
</svg>`;
}

export function createWidget(onActivate) {
    if (document.getElementById('hs-widget')) return;

    const w = document.createElement('div');
    w.id = 'hs-widget';
    w.innerHTML = buildSVG(cfg().score);
    document.body.appendChild(w);

    // drag + double tap
    let drag = false, moved = false, ox = 0, oy = 0, last = 0;

    w.addEventListener('pointerdown', e => {
        const r = w.getBoundingClientRect();
        ox = e.clientX - r.left;
        oy = e.clientY - r.top;
        drag = true; moved = false;
        w.setPointerCapture(e.pointerId);
        e.preventDefault();
    });

    w.addEventListener('pointermove', e => {
        if (!drag) return;
        if (Math.abs(e.movementX) > 4 || Math.abs(e.movementY) > 4) moved = true;
        if (!moved) return;
        w.style.left = Math.max(6, Math.min(window.innerWidth - 90, e.clientX - ox)) + 'px';
        w.style.top = Math.max(6, Math.min(window.innerHeight - 100, e.clientY - oy)) + 'px';
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
        if (now - last < 300) {
            last = 0;
            if (typeof onActivate === 'function') onActivate();
        } else last = now;
    });

    // restore position
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
    if (w) w.innerHTML = buildSVG(cfg().score);
}

export function flashWidget() {
    const w = document.getElementById('hs-widget');
    if (!w) return;
    w.classList.remove('hs-flash');
    void w.offsetWidth;
    w.classList.add('hs-flash');
}