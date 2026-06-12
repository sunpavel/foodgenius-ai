import { InlineKeyboardButton } from 'grammy/types';

// Публичный HTTPS-адрес приложения: явная переменная или домен от Railway
export function publicUrl(): string {
  if (process.env.WEBHOOK_URL) return process.env.WEBHOOK_URL;
  if (process.env.WEBAPP_URL?.startsWith('https://')) return process.env.WEBAPP_URL;
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return process.env.WEBAPP_URL ?? '';
}

export function webappUrl(): string {
  return publicUrl();
}

// Telegram принимает web_app кнопки только с HTTPS.
// В dev-режиме (localhost) показываем заглушку, чтобы бот не падал.
export function webAppButton(text: string, path: string): InlineKeyboardButton {
  const base = webappUrl();
  if (base.startsWith('https://')) {
    return { text, web_app: { url: `${base}${path}` } };
  }
  return { text, callback_data: 'webapp_unavailable' };
}
