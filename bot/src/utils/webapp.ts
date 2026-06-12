import { InlineKeyboardButton } from 'grammy/types';

export function webappUrl(): string {
  return process.env.WEBAPP_URL ?? '';
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
