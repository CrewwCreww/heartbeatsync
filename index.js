import { eventSource, event_types } from '../../../../script.js';
import { cfg, save, defaultSettings } from './config.js';
import { injectStyles, openPanel } from './ui.js';
import { createWidget, refreshWidget, flashWidget } from './heart.js';

// ===== Теги =====
const RE_SYNC  = /{{HS::SYNC:(\d{1,3})}}/gi;
const RE_TYPE  = /{{HS::TYPE:([^}]+)}}/gi;
const RE_EVENT = /{{HS::EVENT:([^}]+)}}/gi;
const RE_NPC   = /{{HS::NPC:([^:]+):(\d{1,3})}}/gi;
const RE_ALL   = /{{HS::(?:SYNC|TYPE|EVENT|NPC)[^}]*}}/gi;

function stripTags(text) {
    return text.replace(RE_ALL, '').trim();
}

function parseAndStrip(text, messageElement) {
    if (!text) return;
    const c = cfg();
    let changed = false;

    const syncs = [...text.matchAll(RE_SYNC)];
    if (syncs.length) {
        const v = Math.max(0, Math.min(100, parseInt(syncs.at(-1)[1], 10)));
        if (v !== c.score) {
            const old = c.score;
            c.score = v;
            changed = true;
            c.milestones.forEach(m => {
                if (!m.done && c.score >= m.threshold) {
                    m.done = true;
                    flashWidget();
                    try { toastr.success('Достижение: ' + m.name); } catch {}
                }
            });
            if (Math.abs(v - old) >= 12) flashWidget();
        }
    }

    const types = [...text.matchAll(RE_TYPE)];
    if (types.length) {
        c.relationType = types.at(-1)[1].trim().toLowerCase();
        changed = true;
    }

    const events = [...text.matchAll(RE_EVENT)];
    if (events.length) {
        flashWidget();
        try { toastr.info('Событие: ' + events.at(-1)[1].trim()); } catch {}
        changed = true;
    }

    [...text.matchAll(RE_NPC)].forEach(m => {
        const name = m[1].trim();
        const sc = Math.max(0, Math.min(100, parseInt(m[2], 10)));
        let n = c.npcs.find(x => x.name.toLowerCase() === name.toLowerCase());
        if (!n) c.npcs.push({ name, score: sc });
        else n.score = sc;
        changed = true;
    });

    // вырезаем теги из DOM, чтобы не засоряли контекст
    if (messageElement && RE_ALL.test(text)) {
        const clean = stripTags(text);
        const mesText = messageElement.querySelector?.('.mes_text') || messageElement;
        if (mesText && mesText.textContent !== clean) {
            mesText.textContent = clean;
        }
    }

    if (changed) {
        save();
        refreshWidget();
        if (document.getElementById('hs-overlay')?.classList.contains('show')) openPanel();
    }
}

// ===== Авто-инъекция =====
const INSTR = `You are under Heartbeat Sync protocol.
At the VERY END of every reply add ONLY these tags (nothing else after them):
{{HS::SYNC:XX}}
Optional: {{HS::TYPE:romance}} {{HS::EVENT:name}} {{HS::NPC:Name:45}}
XX = 0-100. Put tags only at the absolute end. Never explain them.`;

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

// ===== Wand =====
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

// ===== Init =====
jQuery(() => {
    try {
        const c = cfg();
        for (const [k, v] of Object.entries(defaultSettings)) {
            if (c[k] === undefined) c[k] = structuredClone(v);
        }

        injectStyles();
        createWidget(openPanel);
        refreshWidget();

        if (!registerWand()) {
            let t = 0;
            const iv = setInterval(() => { if (registerWand() || ++t > 40) clearInterval(iv); }, 250);
        }

        if (event_types?.CHAT_COMPLETION_PROMPT_READY)
            eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, inject);
        if (event_types?.GENERATE_AFTER_COMBINING_PROMPTS)
            eventSource.on(event_types.GENERATE_AFTER_COMBINING_PROMPTS, inject);

        if (event_types?.MESSAGE_RECEIVED) {
            eventSource.on(event_types.MESSAGE_RECEIVED, () => {
                setTimeout(() => {
                    const last = document.querySelector('#chat .mes:last-child');
                    if (!last) return;
                    const text = last.querySelector('.mes_text')?.textContent || last.textContent;
                    parseAndStrip(text, last);
                }, 300);
            });
        }

        console.log('[Heartbeat Sync] v2.1 loaded');
    } catch (e) {
        console.error('[Heartbeat Sync]', e);
        try { toastr.error('Heartbeat Sync: ' + e.message); } catch {}
    }
});