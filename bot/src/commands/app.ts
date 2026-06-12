import { Context } from 'grammy';
import { webAppButton } from '../utils/webapp';

export async function appCommand(ctx: Context) {
  await ctx.reply('🍽️ *FoodGenius AI* — меню, рецепты и список покупок:', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [webAppButton('🚀 Открыть приложение', '/calendar')],
      ],
    },
  });
}
