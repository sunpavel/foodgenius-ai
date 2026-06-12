import { Context } from 'grammy';
import { webAppButton } from '../utils/webapp';
import { loadUserData } from '../data/user-storage';

export async function shopCommand(ctx: Context) {
  const userId = ctx.from!.id;

  const userData = await loadUserData(userId);
  if (!userData?.mealPlan) {
    await ctx.reply('📋 Сначала создайте план питания: /plan');
    return;
  }

  const list = userData.mealPlan.shoppingList;
  const total = [
    ...list.produce,
    ...list.dairy,
    ...list.meat,
    ...list.pantry,
  ].length;

  await ctx.reply(`🛒 *Список покупок* (${total} позиций)\n\n🥬 Овощи/фрукты: ${list.produce.length}\n🥛 Молочное: ${list.dairy.length}\n🥩 Мясо/рыба: ${list.meat.length}\n🫙 Бакалея: ${list.pantry.length}`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[webAppButton('📋 Открыть список', '/shopping')]],
    },
  });
}
