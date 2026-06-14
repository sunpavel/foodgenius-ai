import React from 'react';
import ReactDOM from 'react-dom/client';
import telegramAnalytics from '@telegram-apps/analytics';
import App from './App';
import './index.css';

// Telegram Apps Center analytics — токен клиентский (по дизайну живёт во фронтенде).
// Инициализируем до рендера; сбой аналитики не должен ломать приложение.
try {
  telegramAnalytics.init({
    token: 'eyJhcHBfbmFtZSI6ImZvb2RnZW5pdXNfYWkiLCJhcHBfdXJsIjoiaHR0cHM6Ly90Lm1lL2Zvb2RnZW5pdXNfYWlfYm90IiwiYXBwX2RvbWFpbiI6Imh0dHBzOi8vZm9vZGdlbml1cy1haS1wcm9kdWN0aW9uLnVwLnJhaWx3YXkuYXBwIn0=!vA+Fr1pRhMkn8hODRhAPPWaEecO+9kqXUMdIb9jN44c=',
    appName: 'foodgenius_ai',
  });
} catch (err) {
  console.error('Telegram Analytics init failed:', err);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
