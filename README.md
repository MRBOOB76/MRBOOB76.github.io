# MRBOOB76.github.io
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MRBOOB76 | Roblox Executors Hub</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, sans-serif; }
        body { background: radial-gradient(circle at top, #1a1c29 0%, #0d0e15 100%); color: #ffffff; padding: 40px 20px; display: flex; flex-direction: column; align-items: center; min-height: 100vh; }
        
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        header { text-align: center; margin-bottom: 40px; opacity: 0; animation: fadeInUp 0.6s ease forwards; }
        header h1 { font-size: 2.5rem; color: #00ff88; text-transform: uppercase; letter-spacing: 2px; }
        .back-btn { display: inline-block; margin-top: 15px; color: #8f9cae; text-decoration: none; font-size: 0.9rem; transition: color 0.2s; }
        .back-btn:hover { color: #00ff88; }

        .section-title { width: 100%; max-width: 1100px; margin: 45px 0 20px 0; font-size: 1.4rem; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; border-left: 4px solid #00ff88; padding-left: 12px; opacity: 0; animation: fadeInUp 0.6s ease forwards; }
        
        .container { width: 100%; max-width: 1100px; display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 25px; margin-bottom: 20px; opacity: 0; animation: fadeInUp 0.6s ease 0.2s forwards; }
        
        .card { background: linear-gradient(145deg, #1d2030, #151722); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 14px; padding: 25px; display: flex; flex-direction: column; transition: all 0.3s ease; position: relative; }
        .card:hover { transform: translateY(-5px); border-color: rgba(0, 255, 136, 0.4); box-shadow: 0 8px 20px rgba(0, 255, 136, 0.1); }
        
        .card.detected-card { opacity: 0.6; }
        .card.detected-card:hover { border-color: rgba(255, 68, 68, 0.4); box-shadow: 0 8px 20px rgba(255, 68, 68, 0.1); }

        .card h2 { font-size: 1.5rem; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
        
        .platform-tag { font-size: 0.75rem; color: #8f9cae; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); }

        .badges { display: flex; gap: 8px; margin-bottom: 15px; flex-wrap: wrap; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid; }
        
        .badge.undetected { background: rgba(0, 255, 136, 0.1); color: #00ff88; border-color: rgba(0, 255, 136, 0.3); }
        .badge.detected { background: rgba(255, 68, 68, 0.1); color: #ff4444; border-color: rgba(255, 68, 68, 0.3); }
        
        .badge.free { background: rgba(0, 191, 255, 0.1); color: #00bfff; border-color: rgba(0, 191, 255, 0.3); }
        .badge.paid { background: rgba(255, 215, 0, 0.1); color: #ffd700; border-color: rgba(255, 215, 0, 0.3); }

        .card p { color: #a2aeca; font-size: 0.95rem; line-height: 1.5; margin-bottom: 25px; flex-grow: 1; }
        
        .warning-text { font-size: 0.8rem; color: #ffbc00; margin-bottom: 15px; font-weight: 600; display: block; }

        .btn { display: block; text-align: center; background: linear-gradient(90deg, #00ff88, #00e577); color: #0d0e15; font-weight: 700; text-decoration: none; padding: 12px; border-radius: 8px; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.5px; transition: all 0.3s; }
        .btn:hover { transform: scale(1.02); box-shadow: 0 4px 12px rgba(0, 255, 136, 0.3); }
        
        .btn.danger { background: linear-gradient(90deg, #ff4444, #cc3333); color: #ffffff; cursor: not-allowed; }
        .btn.danger:hover { box-shadow: 0 4px 12px rgba(255, 68, 68, 0.3); transform: none; }

        footer { margin-top: auto; padding: 60px 0 20px 0; color: #576275; font-size: 0.85rem; text-align: center; }
    </style>
</head>
<body>

    <header>
        <h1>Roblox Executors Hub</h1>
        <a href="index.html" class="back-btn">&larr; На главную страницу</a>
    </header>

    <!-- WINDOWS -->
    <div class="section-title">Windows ИНЖЕКТОРЫ</div>
    <div class="container">
        <!-- SOLARA -->
        <div class="card">
            <h2>Solara <span class="platform-tag">PC</span></h2>
            <div class="badges">
                <div class="badge undetected">Undetected</div>
                <div class="badge free">Free</div>
            </div>
            <p>Один из самых популярных внешних (external) инжекторов для ПК. Работает без системы ключей на Windows 10/11. Хороший уровень исполнения большинства скриптов.</p>
            <a href="https://getsolara.dev/" target="_blank" class="btn">Скачать бесплатно</a>
        </div>

        <!-- XENO -->
        <div class="card">
            <h2>Xeno <span class="platform-tag">PC</span></h2>
            <div class="badges">
                <div class="badge undetected">Undetected</div>
                <div class="badge free">Free</div>
            </div>
            <p>Стабильный бесплатный инжектор. Быстрый запуск и стабильный фреймрейт во время выполнения тяжелых луа-скриптов.</p>
            <span class="warning-text">⚠️ (if web its not .now its virus!)</span>
            <a href="https://xeno.now/download" target="_blank" class="btn">Скачать бесплатно</a>
        </div>

        <!-- SELIWARE -->
        <div class="card">
            <h2>Seliware <span class="platform-tag">PC</span></h2>
            <div class="badges">
                <div class="badge undetected">Undetected</div>
                <div class="badge free">Free / Paid</div>
            </div>
            <p>Продвинутый Windows инжектор с высоким процентом UNC покрытия. Отлично справляется со сложными анимациями и GUI-меню.</p>
            <a href="https://seliware.com" target="_blank" class="btn">Скачать софт</a>
        </div>

        <!-- WAVE -->
        <div class="card">
            <h2>Wave <span class="platform-tag">PC</span></h2>
            <div class="badges">
                <div class="badge undetected">Undetected</div>
                <div class="badge paid">Paid</div>
            </div>
            <p>Премиальный внутренний инжектор со встроенным глубоким обходом Byfron. Защита аккаунта максимального уровня.</p>
            <a href="https://getwave.gg" target="_blank" class="btn">Купить софт</a>
        </div>
    </div>

    <!-- ANDROID & IOS -->
    <div class="section-title" style="border-left-color: #00bfff;">Мобильные инжекторы (Android / iOS)</div>
    <div class="container">
        <!-- DELTA MOBILE -->
        <div class="card">
            <h2>Delta <span class="platform-tag">Android / iOS</span></h2>
            <div class="badges">
                <div class="badge undetected">Undetected</div>
                <div class="badge free">Free</div>
            </div>
            <p>Абсолютный лидер среди мобильных читов. Удобное встроенное меню, легкая установка через APK/IPA файлы и авто-апдейты.</p>
            <a href="https://deltaexecutors.com" target="_blank" class="btn">Скачать на Мобилку</a>
        </div>

        <!-- CODEX -->
        <div class="card">
            <h2>Codex <span class="platform-tag">Android / iOS</span></h2>
            <div class="badges">
                <div class="badge undetected">Undetected</div>
                <div class="badge free">Free</div>
            </div>
            <p>Отличный чит для смартфонов и планшетов с приятным дизайном. Имеет огромную встроенную библиотеку готовых скриптов.</p>
            <a href="https://codex.lol" target="_blank" class="btn">Скачать на Мобилку</a>
        </div>

        <!-- ARCEUS X -->
        <div class="card">
            <h2>Arceus X <span class="platform-tag">Android / iOS</span></h2>
            <div class="badges">
                <div class="badge undetected">Undetected</div>
                <div class="badge free">Free</div>
            </div>
            <p>Один из старейших мобильных инжекторов. Мощный функционал, плавная работа, но требует прохождения системы ключей.</p>
            <a href="https://spdmteam.com" target="_blank" class="btn">Скачать APK/IPA</a>
        </div>
    </div>

    <!-- macOS -->
    <div class="section-title" style="border-left-color: #ffd700;">macOS ИНЖЕКТОРЫ</div>
    <div class="container">
        <!-- MACPLOIT -->
        <div class="card">
            <h2>Macploit <span class="platform-tag">macOS</span></h2>
            <div class="badges">
                <div class="badge undetected">Undetected</div>
                <div class="badge paid">Paid</div>
            </div>
            <p>Главный рабочий инжектор для пользователей Apple Mac. Стабильно работает на процессорах M1/M2/M3 и Intel Mac.</p>
            <a href="https://macploit.xyz" target="_blank" class="btn">Скачать для Mac</a>
        </div>
    </div>

    <!-- DETECTED / OUTDATED -->
    <div class="section-title" style="border-left-color: #ff4444;">Детект и нерабочие (НЕ СКАЧИВАТЬ)</div>
    <div class="container">
        <!-- KRNL -->
        <div class="card detected-card">
            <h2>KRNL <span class="platform-tag">PC</span></h2>
            <div class="badges">
                <div class="badge detected">Detected</div>
                <div class="badge free">Free</div>
            </div>
            <p>Когда-то лучший легендарный инжектор, но сейчас полностью заброшен и моментально банится античитом Byfron.</p>
            <a href="#" class="btn danger">:(</a>
        </div>

        <!-- BUNNI-LOL -->
        <div class="card detected-card">
            <h2>Bunni-lol <span class="platform-tag">PC</span></h2>
            <div class="badges">
Detected
Free

Проект заморожен. Разработчик официально покинул проект (he leaved :(). Не ищите обходы — их нет.
he leaved:(
JJSploit PC

Detected
Free

Давно устаревший софт. Использование гарантирует 100% блокировку вашего аккаунта Roblox в первой же волне банов.
:(

© 2026 MRBOOB76. Инжекторы собраны на основе базы ScriptBlox.
