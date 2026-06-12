import { Context } from 'grammy';
import { webAppButton } from '../utils/webapp';

export async function startCommand(ctx: Context) {
  const name = ctx.from?.first_name ?? 'друг';

  await ctx.reply(
    `👋 Привет, ${name}!\n\n🍽️ *FoodGenius AI* — планирую питание и список покупок за вас.\n\n✅ Меню на неделю под вашу семью\n✅ Список покупок по категориям\n✅ Рецепты с пошаговыми инструкциями\n✅ Изменения плана одной командой\n\nНачнём с настройки — это займёт 30 секунд 👇`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [webAppButton('🚀 Настроить предпочтения', '/setup')],
          [{ text: '📋 Как это работает?', callback_data: 'how_it_works' }],
        ],
      },
    },
  );
}
