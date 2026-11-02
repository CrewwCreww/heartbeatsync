import { extension_settings } from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../../script.js';

export const EXT_NAME = 'heartbeat-sync';

export const defaultSettings = {
    isEnabled: true,
    score: 42,
    relationType: 'neutral',
    sensorsActive: false,
    widgetPos: null,
    milestones: [
        { id: 'trust', name: 'Доверие', threshold: 35, done: false },
        { id: 'confession', name: 'Признание', threshold: 60, done: false },
        { id: 'kiss', name: 'Поцелуй', threshold: 75, done: false },
        { id: 'sync', name: 'Полная синхронизация', threshold: 95, done: false },
    ],
    npcs: [], // { name, score }
};

export function cfg() {
    if (!extension_settings[EXT_NAME]) {
        extension_settings[EXT_NAME] = structuredClone(defaultSettings);
    }
    const c = extension_settings[EXT_NAME];
    for (const [k, v] of Object.entries(defaultSettings)) {
        if (c[k] === undefined) c[k] = structuredClone(v);
    }
    return c;
}

export function save() {
    saveSettingsDebounced();
}