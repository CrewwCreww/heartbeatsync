// heartbeatsync/script.js
(function () {
    const TAGS = {
        SYNC: '{{HS::SYNC:',
        EVENT: '{{HS::EVENT:'
    };

    let currentSync = 0;
    let syncTrend = 'stable';

    // Безопасное получение данных персонажа
    function getCharData() {
        const ctx = SillyTavern.getContext();
        const char = ctx?.characters?.[ctx.characterId];
        return {
            name: char?.name || char?.data?.name || 'Unknown Subject',
            desc: char?.description || ''
        };
    }

    // Обновление визуала сердца (Bio-Glass стиль)
    function updateHeartVisual(score, trend) {
        const heartIcon = document.getElementById('hs-heart-icon');
        const ecgLine = document.getElementById('hs-ecg-line');
        const scoreText = document.getElementById('hs-score-val');
        
        if (!heartIcon || !scoreText) return;

        let color = '#555'; 
        let glow = 'none';
        let opacity = 0.3;

        if (score > 80) {
            color = '#ff0040';
            glow = '0 0 15px #ff0040, inset 0 0 10px #ff0040';
            opacity = 1;
        } else if (score > 50) {
            color = '#e74c3c';
            glow = '0 0 8px rgba(231, 76, 60, 0.6)';
            opacity = 0.8;
        } else if (score > 20) {
            color = '#a93226';
            opacity = 0.6;
        }

        heartIcon.style.color = color;
        heartIcon.style.filter = `drop-shadow(${glow})`;
        heartIcon.style.opacity = opacity;
        scoreText.innerText = score;

        const duration = trend === 'up' ? '0.6s' : (trend === 'down' ? '1.2s' : '0.9s');
        heartIcon.style.animationDuration = duration;
        
        if (trend !== 'stable') {
            ecgLine?.classList.add('active');
        } else {
            ecgLine?.classList.remove('active');
        }
    }

    // РЕАЛЬНАЯ генерация правил через API
    async function generateSyncRules() {
        const char = getCharData();
        const btn = document.getElementById('hs-init-btn');
        
        if (char.name === 'Unknown Subject') {
            showToast('⚠️ Сначала выбери персонажа!', 'error');
            return;
        }

        // Блокируем кнопку во время запроса
        if (btn) {
            btn.disabled = true;
            btn.innerText = '⏳ Синхронизация...';
        }

        const systemPrompt = `Ты - система анализа эмоциональной синхронизации "Heartbeat Sync".
На основе профиля "${char.name}" создай JSON-конфигурацию диапазонов синхронизации.
Верни ТОЛЬКО валидный JSON без markdown:
{
  "sync_ranges": [
    {"min": 0, "max": 20, "label": "Desynchronized", "color": "#555"},
    {"min": 21, "max": 50, "label": "Stable Connection", "color": "#4a90e2"},
    {"min": 51, "max": 80, "label": "Resonance", "color": "#9b59b6"},
    {"min": 81, "max": 100, "label": "Perfect Sync", "color": "#e74c3c"}
  ],
  "triggers": [
    {"action": "touch", "delta": 5},
    {"action": "lie", "delta": -15}
  ]
}`;

        try {
            // Прямой запрос к подключенной нейросети через ST API
            const response = await fetch('/api/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    messages: [{ role: 'system', content: systemPrompt }],
                    temperature: 0.7 
                })
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            
            // Чистим ответ от markdown-блоков
            let cleanJson = data.choices[0].message.content.replace(/```json|```/g, '').trim();
            const rules = JSON.parse(cleanJson);
            
            localStorage.setItem('hs_rules_' + char.name, JSON.stringify(rules));
            updateHeartVisual(50, 'stable'); // Старт с 50% после успешной настройки
            showToast(`✅ Сенсоры активны для ${char.name}`, 'success');
        } catch (e) {
            console.error(e);
            showToast(`❌ Ошибка связи: ${e.message}`, 'error');
        } finally {
            // Разблокируем кнопку
            if (btn) {
                btn.disabled = false;
                btn.innerText = 'Activate Sensors';
            }
        }
    }

    // Парсер тегов в сообщениях чата
    function parseMessageForTags(text) {
        const syncMatch = text.match(/{{HS::SYNC:(\d+)}}/);
        if (syncMatch) {
            const newScore = parseInt(syncMatch[1]);
            const diff = newScore - currentSync;
            const trend = diff > 0 ? 'up' : (diff < 0 ? 'down' : 'stable');
            
            currentSync = newScore;
            updateHeartVisual(currentSync, trend);
        }
    }

    // Инициализация интерфейса
    function init() {
        // Плавающий виджет в чате
        const widget = document.createElement('div');
        widget.id = 'hs-widget';
        widget.innerHTML = `
            <div class="hs-glass-container">
                <div class="hs-heart-wrapper">
                    <svg id="hs-heart-icon" viewBox="0 0 24 24" fill="currentColor" class="hs-heart-svg">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    <div class="hs-pulse-ring"></div>
                </div>
                <div class="hs-data-panel">
                    <div class="hs-label">SYNC RATE</div>
                    <div class="hs-score"><span id="hs-score-val">--</span>%</div>
                    <div id="hs-ecg-line" class="hs-ecg"></div>
                </div>
            </div>
        `;
        document.body.appendChild(widget);

        // Панель настроек в Extensions
        const settingsPanel = document.createElement('div');
        settingsPanel.id = 'hs-settings-panel';
        settingsPanel.innerHTML = `
            <h3>💓 Heartbeat Sync Settings</h3>
            <button id="hs-init-btn" class="menu_button">Activate Sensors</button>
            <p style="font-size:0.8em; color:#888;">AI will inject {{HS::SYNC:X}} tags automatically.</p>
        `;
        
        const target = document.getElementById('extensions_settings');
        if (target) target.appendChild(settingsPanel);

        document.getElementById('hs-init-btn').onclick = generateSyncRules;

        // Слежение за новыми сообщениями в чате
        const chatObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.classList && node.classList.contains('mes')) {
                        parseMessageForTags(node.innerText);
                    }
                });
            });
        });
        
        const chatLog = document.getElementById('chat_log');
        if (chatLog) chatObserver.observe(chatLog, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();