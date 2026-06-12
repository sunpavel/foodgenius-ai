# FoodGenius AI

AI-планировщик питания для Telegram: бот + Mini App. Генерирует меню на неделю с рецептами и КБЖУ, собирает список покупок, подстраивается под семью, диету и бюджет.

**Бот:** [@foodgenius_ai_bot](https://t.me/foodgenius_ai_bot)

## Стек

- **Бот:** Node.js + TypeScript, grammy, Express, OpenAI API (gpt-4o-mini)
- **Mini App:** React + Vite + Tailwind, framer-motion (тёмная premium-тема)
- **Данные:** JSON-файлы в `user_data/` (MVP)
- В продакшене Express бота раздаёт и API, и собранный Mini App — один сервис, один домен

## Команды бота

| Команда | Действие |
|---|---|
| `/start` | Приветствие + настройка профиля |
| `/plan` | Сгенерировать план на неделю |
| `/cook` | Меню на сегодня |
| `/shop` | Список покупок |
| `/adjust <запрос>` | Изменить план («замени ужин в среду на рыбу») |

## Деплой на Railway

1. **New Project → Deploy from GitHub repo** → выберите `sunpavel/foodgenius-ai`. Railway сам найдёт `Dockerfile` (конфиг в `railway.json`).

2. **Variables** — добавьте переменные:

   | Переменная | Значение |
   |---|---|
   | `BOT_TOKEN` | токен из @BotFather |
   | `OPENAI_API_KEY` | ключ OpenAI |
   | `NODE_ENV` | `production` |
   | `WEBHOOK_URL` | `https://<домен>.up.railway.app` (см. шаг 3) |
   | `WEBAPP_URL` | то же значение, что `WEBHOOK_URL` |

3. **Settings → Networking → Generate Domain** — получите домен вида `foodgenius-ai-production.up.railway.app`, подставьте его в `WEBHOOK_URL` и `WEBAPP_URL` (с `https://`).

4. **Volume** (чтобы данные пользователей переживали редеплой): правый клик по сервису → **Attach Volume** → mount path `/app/user_data`.

5. **Redeploy.** В логах должно появиться `Bot running in webhook mode` и `Serving Mini App from /app/public`.

6. **BotFather:** `/setmenubutton` → URL = ваш Railway-домен; `/newapp` → тот же URL (для ссылки `t.me/foodgenius_ai_bot/<shortname>`).

## Локальная разработка

```bash
# 1. Заполните bot/.env (см. .env.example)
cd bot && npm i && npm run dev      # бот в polling-режиме + API на :3000
cd webapp && npm i && npm run dev   # Mini App на :5173 (с прокси /api → :3000)
```

Без Telegram webapp работает в demo-режиме (бейдж «ДЕМО», встроенный план).

## Структура

```
├── bot/            # Telegram-бот: команды, OpenAI, REST API для Mini App
├── webapp/         # Mini App: React + Vite
├── assets/         # Иконка и баннер для каталогов (appss.pro)
├── Dockerfile      # Multi-stage: webapp build + bot build → один образ
├── railway.json    # Конфиг Railway
└── docker-compose.yml  # Альтернатива: деплой на свой VPS
```
