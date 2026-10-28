# MRBOOB76.github.io
Creating

<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MRBOOB76 | Premium Cheats</title>
    <style>
        /* Общие настройки и сброс стилей */
        * { 
            box-sizing: border-box; 
            margin: 0; 
            padding: 0; 
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
        }
        
        body { 
            background: radial-gradient(circle at top, #1a1c29 0%, #0d0e15 100%);
            color: #ffffff; 
            padding: 40px 20px; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            min-height: 100vh;
            overflow-x: hidden;
        }

        /* Анимация плавного появления при загрузке страницы */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes pulseGlow {
            0% { text-shadow: 0 0 10px rgba(0, 255, 136, 0.2); }
            50% { text-shadow: 0 0 20px rgba(0, 255, 136, 0.6); }
            100% { text-shadow: 0 0 10px rgba(0, 255, 136, 0.2); }
        }

        /* Шапка сайта */
        header { 
            text-align: center; 
            margin-bottom: 50px; 
            opacity: 0;
            animation: fadeInUp 0.8s ease forwards;
        }
        
        header h1 { 
            font-size: 3rem; 
            color: #00ff88; 
            text-transform: uppercase; 
            letter-spacing: 4px; 
            animation: pulseGlow 3s infinite ease-in-out;
        }
        
        header p { 
            color: #8f9cae; 
            margin-top: 12px; 
            font-size: 1.2rem; 
            font-weight: 300;
        }

        /* Сетка для карточек читов */
        .container { 
            width: 100%; 
            max-width: 1100px; 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); 
            gap: 30px; 
            padding: 10px;
            opacity: 0;
            animation: fadeInUp 0.8s ease 0.2s forwards; /* Задержка появления */
        }

        /* Крутая карточка с плавными переходами */
        .card { 
            background: linear-gradient(145deg, #1d2030, #151722); 
            border: 1px solid rgba(255, 255, 255, 0.05); 
            border-radius: 16px; 
            padding: 30px; 
            display: flex; 
            flex-direction: column; 
            position: relative;
            overflow: hidden;
            transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1); /* Плавный выезд */
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
        }

        /* Эффект при наведении на карточку */
        .card:hover { 
            transform: translateY(-8px); 
            border-color: rgba(0, 255, 136, 0.5); 
            box-shadow: 0 12px 24px rgba(0, 255, 136, 0.15); 
        }

        /* Неоновая полоска сверху при наведении */
        .card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 3px;
            background: linear-gradient(90deg, #00ff88, #00bfff);
            transform: scaleX(0);
            transform-origin: left;
            transition: transform 0.4s ease;
        }
        .card:hover::before {
            transform: scaleX(1);
        }

        .card h2 { 
            font-size: 1.6rem; 
            margin-bottom: 12px; 
            color: #ffffff; 
            letter-spacing: 0.5px;
        }

        /* Статус-счетчик */
        .status { 
            display: inline-block; 
            padding: 6px 12px; 
            border-radius: 6px; 
            font-size: 0.75rem; 
            font-weight: 700; 
            margin-bottom: 20px; 
            width: fit-content; 
            text-transform: uppercase;
            letter-spacing: 1px;
            background-color: rgba(0, 255, 136, 0.1); 
            color: #00ff88; 
            border: 1px solid rgba(0, 255, 136, 0.3); 
        }

        .card p { 
            color: #a2aeca; 
            font-size: 1rem; 
            line-height: 1.6; 
            margin-bottom: 30px; 
            flex-grow: 1; 
        }

        /* Анимированная кнопка скачивания */
        .btn { 
            display: block; 
            text-align: center; 
            background: linear-gradient(90deg, #00ff88, #00e577); color: #0f111a; 
            color: #0d0e15;
            font-weight: 700; 
            text-decoration: none; 
            padding: 14px; 
            border-radius: 10px; 
            text-transform: uppercase; 
            font-size: 0.9rem; 
            letter-spacing: 1px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 255, 136, 0.2);
        }

        .btn:hover { 
            background: linear-gradient(90deg, #00e577, #00ff88);
            transform: scale(1.02);
            box-shadow: 0 6px 20px rgba(0, 255, 136, 0.4);
        }

        /* Футер */
        footer { 
            margin-top: auto; 
            padding: 60px 0 20px 0; 
            color: #576275; 
            font-size: 0.9rem; 
            text-align: center; 
            opacity: 0;
            animation: fadeInUp 0.8s ease 0.4s forwards;
        }
    </style>
</head>
<body>

    <header>
        <h1>MRBOOB76 CHEATS</h1>
        <p>Безопасный софт для твоих любимых игр без вирусов и скрытых угроз</p>
    </header>

    <div class="container">
        <!-- Карточка 1: CS2 -->
        <div class="card">
            <h2>Counter-Strike 2</h2>
            <div class="status">Undetected</div>
            <p>Приватный софт со встроенным обходом VAC. Доступны функции: Legit Aimbot, Wallhack (ESP) с отображением здоровья, Glow и отключение отдачи.</p>
            <!-- Вместо знака # вставь ссылку из Linkvertise -->
            <a href="#" target="_blank" class="btn">Скачать через Linkvertise</a>
        </div>

        <!-- Карточка 2: Roblox -->
        <div class="card">
            <h2>Roblox Executor</h2>
            <div class="status">Undetected</div>
            <p>Мощный и стабильный инжектор скриптов. Поддерживает работу с топовыми скриптами для Blox Fruits, Brookhaven и прочих режимов без вылетов.</p>
            <!-- Вместо знака # вставь ссылку из Linkvertise -->
            <a href="#" target="_blank" class="btn">Скачать через Linkvertise</a>
        </div>

        <!-- Карточка 3: Minecraft -->
        <div class="card">
            <h2>Minecraft Hack</h2>
            <div class="status">Undetected</div>
            <p>Чит-клиент для игры на серверах и мирах. Обходит популярные античиты. Функции: KillAura с точной настройкой, Fly, X-Ray и AutoArmor.</p>
            <!-- Вместо знака # вставь ссылку из Linkvertise -->
            <a href="#" target="_blank" class="btn">Скачать через Linkvertise</a>
        </div>
    </div>

    <footer>
        <p>&copy; 2026 MRBOOB76. Все материалы предоставлены исключительно в ознакомительных целях.</p>
    </footer>

</body>
</html>
