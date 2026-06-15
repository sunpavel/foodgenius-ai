import { Context } from 'grammy';
import { webAppButton } from '../utils/webapp';
import { loadUserData, getTodayFromPlan } from '../data/user-storage';

export async function shopCommand(ctx: Context) {
  const userId = ctx.from!.id;

  const userData = await loadUserData(userId);
  if (!userData?.mealPlan) {
    await ctx.reply('📋 Сначала создайте план питания: /plan');
    return;
  }

  // Покупки на сегодня — ингредиенты блюд текущего дня
  const today = getTodayFromPlan(userData.mealPlan);
  const todayItems = today
    ? Array.from(new Set([
        ...(today.breakfast.ingredients ?? []),
        ...(today.lunch.ingredients ?? []),
        ...(today.dinner.ingredients ?? []),
      ]))
    : [];

  const list = userData.mealPlan.shoppingList;
  const weekTotal = list.produce.length + list.dairy.length + list.meat.length + list.pantry.length;

  let msg: string;
  if (todayItems.length) {
    msg = `🛒 *Покупки на сегодня* (${todayItems.length})\n\n` +
      todayItems.map((i) => `• ${i}`).join('\n') +
      `\n\n_Полный список на неделю: ${weekTotal} позиций_`;
  } else {
    msg = `🛒 *Список покупок на неделю* — ${weekTotal} позиций\n\n` +
      `🥬 Овощи/фрукты: ${list.produce.length}\n🥛 Молочное: ${list.dairy.length}\n🥩 Мясо/рыба: ${list.meat.length}\n🫙 Бакалея: ${list.pantry.length}`;
  }

  await ctx.reply(msg, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[webAppButton('📋 Открыть список', '/shopping')]],
    },
  });
}
