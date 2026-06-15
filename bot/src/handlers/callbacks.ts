import { Context } from 'grammy';
import { loadUserData } from '../data/user-storage';

export async function handleCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;

  // Поделиться реферальной ссылкой
  if (data?.startsWith('referral:')) {
    await ctx.answerCallbackQuery();
    const userData = await loadUserData(ctx.from!.id);
    const code = userData?.referralCode ?? '';
    const botUsername = (await ctx.api.getMe()).username;
    const link = `https://t.me/${botUsername}?start=ref_${code}`;
    await ctx.reply(
      `Попробуй FoodGenius — AI составляет меню на неделю под твои цели и тренировки 🍽️\n\n${link}`,
    );
    return;
  }

  if (data === 'webapp_unavailable') {
    await ctx.answerCallbackQuery({
      text: 'Mini App станет доступен после публикации приложения (нужен HTTPS-адрес)',
      show_alert: true,
    });
    return;
  }

  await ctx.answerCallbackQuery('OK');
}
