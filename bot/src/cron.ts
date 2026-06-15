import cron from 'node-cron';
import { Bot } from 'grammy';
import { webAppButton } from './utils/webapp';
import { getAllUserIds, getTodayFromPlan, isActiveUser, loadUserData } from './data/user-storage';

const MSK = { timezone: 'Europe/Moscow' };

// Небольшая пауза между отправками, чтобы не упереться в лимиты Telegram (~30 msg/сек)
const throttle = () => new Promise((r) => setTimeout(r, 60));

export function registerCron(bot: Bot): void {
  // ── 6:00 МСК — утреннее меню активным пользователям ──────────
  cron.schedule('0 6 * * *', async () => {
    const userIds = await getAllUserIds();
    for (const userId of userIds) {
      try {
        if (!(await isActiveUser(userId, 3))) continue;
        const data = await loadUserData(userId);
        if (!data?.mealPlan) continue;
        const today = getTodayFromPlan(data.mealPlan);
        if (!today) continue;

        const sum = (k: 'calories' | 'protein' | 'carbs' | 'fat') =>
          (today.breakfast[k] || 0) + (today.lunch[k] || 0) + (today.dinner[k] || 0);

        const progressText = data.preferences?.goal === 'lose_weight'
          ? '📍 Минус ~0.5 кг в неделю если питаться по этому меню'
          : data.preferences?.goal === 'gain_muscle'
          ? '📍 Плюс ~0.5 кг мышц в неделю при таком рационе'
          : '📍 Поддерживаем форму — сбалансированный день';

        await bot.api.sendMessage(userId,
          `🍽️ Меню на сегодня готово!\n\n` +
          `☀️ Завтрак: ${today.breakfast.name}\n` +
          `🌤️ Обед: ${today.lunch.name}\n` +
          `🌙 Ужин: ${today.dinner.name}\n\n` +
          `${progressText}\n` +
          `🔥 ${sum('calories')} ккал  🥩 ${sum('protein')}г  🌾 ${sum('carbs')}г  🥑 ${sum('fat')}г`,
          { reply_markup: { inline_keyboard: [[webAppButton('Посмотреть в приложении', '/calendar')]] } },
        ).catch(() => {}); // молча игнорируем, если бот заблокирован
        await throttle();
      } catch {
        // один пользователь не должен ломать всю рассылку
      }
    }
  }, MSK);

  // ── 0:00 МСК — re-engagement по дням неактивности ────────────
  cron.schedule('0 0 * * *', async () => {
    const reengagement: Record<number, { text: string; buttonText: string; showReferral?: boolean }> = {
      4: {
        text: `🍳 Эй, твоя попка продолжает расти?\n\nЯ тут придумал кое-что вкусное на сегодня. Загляни.`,
        buttonText: 'Смотреть меню',
      },
      7: {
        text: `🪞 Серьёзно, ты вообще ел нормально эту неделю?\n\nПицца не считается. Я проверил.\nДавай исправим это прямо сейчас.`,
        buttonText: 'Исправить питание',
      },
      14: {
        text: `😮‍💨 Ладно, я всё понял.\n\nТы питаешься как студент на сессии.\nДоширак это не углеводы — это приговор.\n\nВозвращайся, пока не стало хуже 👀`,
        buttonText: 'Спасти себя',
      },
      21: {
        text: `🏃 Твой друг уже питается правильно.\n\nА ты всё ещё думаешь что кофе — это завтрак?`,
        buttonText: 'Вернуться',
        showReferral: true,
      },
    };

    const userIds = await getAllUserIds();
    for (const userId of userIds) {
      try {
        const data = await loadUserData(userId);
        if (!data?.lastActive) continue;
        const daysSince = Math.floor((Date.now() - new Date(data.lastActive).getTime()) / 86400000);
        const msg = reengagement[daysSince];
        if (!msg) continue;

        const keyboard = msg.showReferral
          ? [[webAppButton(msg.buttonText, '/calendar'), { text: 'Позвать друга 😄', callback_data: `referral:${userId}` }]]
          : [[webAppButton(msg.buttonText, '/calendar')]];

        await bot.api.sendMessage(userId, msg.text, {
          reply_markup: { inline_keyboard: keyboard },
        }).catch(() => {});
        await throttle();
      } catch {
        // пропускаем проблемного пользователя
      }
    }
  }, MSK);

  console.log('Cron jobs scheduled (Europe/Moscow): 06:00 morning, 00:00 re-engagement');
}
