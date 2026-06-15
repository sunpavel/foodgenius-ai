import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Bot, webhookCallback } from 'grammy';
import express from 'express';
import cors from 'cors';
import { startCommand } from './commands/start';
import { appCommand } from './commands/app';
import { planCommand } from './commands/plan';
import { shopCommand } from './commands/shop';
import { cookCommand } from './commands/cook';
import { adjustCommand } from './commands/adjust';
import { handleCallback } from './handlers/callbacks';
import { handleInlineQuery } from './handlers/inline';
import { createRouter } from './api/routes';
import { publicUrl } from './utils/webapp';
import { analyticsMiddleware, registerAdminCommands } from './admin';
import { registerCron } from './cron';

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN is required in .env');

const bot = new Bot(BOT_TOKEN);

// Аналитика — первым, до всех остальных обработчиков
bot.use(analyticsMiddleware);

// Админ-команды /stats и /export (защищены adminOnly)
registerAdminCommands(bot);

// Верификация для каталога appss.pro
bot.command('appss_verify', (ctx) => ctx.reply('appss_6d4187'));

// Commands (per spec: /start, /plan, /shop, /cook, /adjust + /app)
bot.command('app', appCommand);
bot.command('start', startCommand);
bot.command('plan', planCommand);
bot.command('shop', shopCommand);
bot.command('cook', cookCommand);
bot.command('adjust', adjustCommand);

// Постоянные нижние кнопки (reply-клавиатура из /start)
bot.hears('🍳 Меню', cookCommand);
bot.hears('🛒 Покупки', shopCommand);

// Callbacks + inline mode
bot.on('callback_query:data', handleCallback);
bot.on('inline_query', handleInlineQuery);

// Cron: утренние уведомления и re-engagement
registerCron(bot);

// Глобальный обработчик — бот не должен падать из-за одной ошибки
bot.catch((err) => {
  console.error('Bot error:', err.message);
});

// Express server
const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

// API routes for Mini App
app.use('/api', createRouter());

const PORT = Number(process.env.PORT ?? 3000);

// Статика Mini App: в продакшене webapp собирается в ../public (см. Dockerfile)
function mountWebapp() {
  const publicDir = process.env.PUBLIC_DIR ?? path.resolve(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)) return;
  app.use(express.static(publicDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/webhook')) return next();
    res.sendFile(path.join(publicDir, 'index.html'));
  });
  console.log(`Serving Mini App from ${publicDir}`);
}

const PUBLIC_URL = publicUrl();
console.log(`Public URL: ${PUBLIC_URL || '(не задан — polling-режим)'}`);

if (PUBLIC_URL.startsWith('https://')) {
  const webhookPath = `/webhook/${BOT_TOKEN}`;
  app.use(webhookPath, webhookCallback(bot, 'express'));
  mountWebapp();
  app.listen(PORT, async () => {
    const webhookUrl = `${PUBLIC_URL}${webhookPath}`;
    try {
      await bot.api.setWebhook(webhookUrl);
      console.log(`Bot running in webhook mode on port ${PORT}`);
      console.log(`Webhook: ${webhookUrl}`);
    } catch (err) {
      console.error('setWebhook failed:', err);
    }
  });
} else {
  mountWebapp();
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
  bot.start({
    onStart: () => console.log('Bot started in polling mode'),
  });
}
