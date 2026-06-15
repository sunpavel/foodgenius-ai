import { Context, Keyboard } from 'grammy';
import { webAppButton } from '../utils/webapp';
import { loadUserData, saveUserData } from '../data/user-storage';

// Постоянные кнопки внизу чата: «Меню» и «Покупки» (reply-клавиатура).
// При тапе шлют свой текст — он ловится в bot.hears (см. bot.ts).
export const mainKeyboard = new Keyboard()
  .text('🍳 Меню').text('🛒 Покупки')
  .resized()
  .persistent();

export async function startCommand(ctx: Context) {
  const name = ctx.from?.first_name ?? 'друг';
  const userId = ctx.from?.id;

  // Захват реферала из deep-link: /start ref_CODE
  const payload = ctx.match?.toString().trim() ?? '';
  if (userId && payload.startsWith('ref_')) {
    const code = payload.slice(4).toUpperCase();
    const existing = await loadUserData(userId);
    if (code && !existing?.referredBy && existing?.referralCode !== code) {
      await saveUserData(userId, { referredBy: code });
    }
  }

  await ctx.reply(
    `👋 Привет, ${name}!\n\n🍽️ *FoodGenius AI* — планирую питание и список покупок за вас.\n\n✅ Меню на неделю под вашу цель\n✅ Список покупок по категориям\n✅ Рецепты с пошаговыми инструкциями\n✅ Учёт тренировок и КБЖУ\n\nНажмите *App* слева от поля ввода, чтобы открыть приложение, или пользуйтесь кнопками снизу 👇`,
    {
      parse_mode: 'Markdown',
      reply_markup: mainKeyboard,
    },
  );

  // Отдельным сообщением — прямая кнопка открыть приложение (web_app)
  await ctx.reply('Готовы начать?', {
    reply_markup: { inline_keyboard: [[webAppButton('🚀 Открыть приложение', '/')]] },
  });
}
