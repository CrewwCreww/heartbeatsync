// heartbeatsync/script.js
(function () {
    const TAGS = {
        SYNC: '{{HS::SYNC:',
        EVENT: '{{HS::EVENT:'
    };

    // Состояние виджета
    let currentSync = 0;
    let syncTrend = 'stable'; // up, down, stable

    // Безопасное получение данных
    function getCharData() {
        const ctx = SillyTavern.getContext();
        const char = ctx?.characters?.[ctx.characterId];
        return {
            name: char?.name || char?.data?.name || 'Unknown Subject',
            desc: char?.description || ''
        };
    }

    // Обновление визуала сердца
    function updateHeartVisual(score, trend) {
        const heartIcon = document.getElementById('hs-heart-icon');
        const ecgLine = document.getElementById('hs-ecg-line');
        const scoreText = document.getElementById('hs-score-val');
        
        if (!heartIcon) return;

        // 1. Цвет и свечение зависят от счета
        let color = '#555'; // Мертвый/Низкий
        let glow = 'none';
        let opacity = 0.3;

        if (score > 80) {
            color = '#ff0040'; // Яркий красный
            glow = '0 0 15px #ff0040, inset 0 0 10px #ff0040';
            opacity = 1;
        } else if (score > 50) {
            color = '#e74c3c'; // Нормальный красный
            glow = '0 0 8px rgba(231, 76, 60, 0.6)';
            opacity = 0.8;
        } else if (score > 20) {
            color = '#a93226'; // Темный красный
            opacity = 0.6;
        }

        heartIcon.style.color = color;
        heartIcon.style.filter = `drop-shadow(${glow})`;
        heartIcon.style.opacity = opacity;
        scoreText.innerText = score;

        // 2. Анимация пульса зависит от тренда
        const duration = trend === 'up' ? '0.6s' : (trend === 'down' ? '1.2s' : '0.9s');
        heartIcon.style.animationDuration = duration;
        
        // 3. Линия ЭКГ (имитация через CSS background position)
        if (trend !== 'stable') {
            ecgLine.classList.add('active');
        } else {
            ecgLine.classList.remove('active');
        }
    }

    // Генерация правил
    async function generateSyncRules() {
        const char = getCharData();
        showToast(`⚡ Настройка сенсоров для ${char.name}...`, 'info');
        
        // Здесь должен быть запрос к API, но для примера ставим заглушку
        // В реальности тут fetch к /api/chat/completions
        setTimeout(() => {
            localStorage.setItem('hs_active', 'true');
            showToast('✅ Сенсоры активны. Ожидание данных...', 'success');
            updateHeartVisual(50, 'stable'); // Старт с 50%
        }, 1000);
    }

    // Парсер сообщений (ловит теги в чате)
    function parseMessageForTags(text) {
        const syncMatch = text.match(/{{HS::SYNC:(\d+)}}/);
        if (syncMatch) {
            const newScore = parseInt(syncMatch[1]);
            const diff = newScore - currentSync;
            const trend = diff > 0 ? 'up' : (diff < 0 ? 'down' : 'stable');
            
            currentSync = newScore;
            updateHeartVisual(currentSync, trend);
            
            // Удаляем тег из видимого текста сообщения (если нужно)
            // SillyTavern обычно сам рендерит, но можно скрыть через CSS
        }
    }

    // Инициализация
    function init() {
        // Создаем плавающий виджет поверх чата
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

        // Кнопка настроек в расширениях
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

        // Слушаем новые сообщения (MutationObserver для интеграции с чатом)
        const chatObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.classList && node.classList.contains('mes')) {
                        const text = node.innerText;
                        parseMessageTags(text);
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
