#!/bin/bash
set -e

echo "🍽️  FoodGenius AI — запуск"
echo "================================"

# Check .env
if [ ! -f "bot/.env" ]; then
  echo "⚙️  Создаю bot/.env из примера..."
  cp bot/.env.example bot/.env
  echo ""
  echo "⚠️  ВАЖНО: заполните bot/.env:"
  echo "   BOT_TOKEN=   — токен от @BotFather"
  echo "   OPENAI_API_KEY= — ключ OpenAI"
  echo ""
  echo "После заполнения запустите ./start.sh снова"
  exit 0
fi

echo "📦 Устанавливаю зависимости бота..."
cd bot && npm install && cd ..

echo "📦 Устанавливаю зависимости веб-приложения..."
cd webapp && npm install && cd ..

echo ""
echo "✅ Готово! Запускаю..."
echo ""
echo "  Bot API:  http://localhost:3000"
echo "  Web App:  http://localhost:5173"
echo ""
echo "Нажмите Ctrl+C для остановки"
echo ""

# Run bot and webapp in parallel
trap 'kill 0' INT
cd bot && npm run dev &
cd webapp && npm run dev &
wait
