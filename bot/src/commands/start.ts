import { Context } from 'grammy';
import { webAppButton } from '../utils/webapp';
import { loadUserData, saveUserData } from '../data/user-storage';

export async function startCommand(ctx: Context) {
  const name = ctx.from?.first_name ?? 'друг';
  const userId = ctx.from?.id;

  // Захват реферала из deep-link: /start ref_CODE
  const payload = ctx.match?.toString().trim() ?? '';
  if (userId && payload.startsWith('ref_')) {
    const code = payload.slice(4).toUpperCase();
    const existing = await loadUserData(userId);
    // Засчитываем только новым пользователям и не самому себе
    if (code && !existing?.referredBy && existing?.referralCode !== code) {
      await saveUserData(userId, { referredBy: code });
    }
  }

  await ctx.reply(
    `👋 Привет, ${name}!\n\n🍽️ *FoodGenius AI* — планирую питание и список покупок за вас.\n\n✅ Меню на неделю под вашу цель\n✅ Список покупок по категориям\n✅ Рецепты с пошаговыми инструкциями\n✅ Учёт тренировок и КБЖУ\n\nНачнём — это займёт 30 секунд 👇`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [webAppButton('🍽️ Открыть меню', '/')],
        ],
      },
    },
  );
}
