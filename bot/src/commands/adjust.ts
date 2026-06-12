import { Context } from 'grammy';
import { adjustMealPlan } from '../ai/meal-planner';
import { webAppButton } from '../utils/webapp';
import { loadUserData, saveUserData } from '../data/user-storage';

// Защита от дублей: Telegram ретраит webhook, если ответ не пришёл мгновенно
const inFlight = new Set<number>();

export async function adjustCommand(ctx: Context) {
  const userId = ctx.from!.id;

  if (inFlight.has(userId)) return;

  const request = ctx.match?.toString().trim();
  if (!request) {
    await ctx.reply(
      `✏️ *Как изменить план*\n\nНапишите после команды, что поменять:\n\n` +
      `\`/adjust замени ужин в среду на рыбу\`\n` +
      `\`/adjust убери блюда с грибами\`\n` +
      `\`/adjust сделай завтраки быстрее 10 минут\``,
      { parse_mode: 'Markdown' },
    );
    return;
  }

  const userData = await loadUserData(userId);
  if (!userData?.mealPlan || !userData.preferences) {
    await ctx.reply('📋 Сначала создайте план питания: /plan');
    return;
  }

  inFlight.add(userId);
  const thinking = await ctx.reply('✏️ Корректирую план...');

  // Правка идёт в фоне — webhook-ответ Telegram возвращается сразу (см. plan.ts)
  void (async () => {
    try {
      const mealPlan = await adjustMealPlan(userData.preferences!, userData.mealPlan!, request);
      await saveUserData(userId, { mealPlan });

      await ctx.api.editMessageText(
        ctx.chat!.id,
        thinking.message_id,
        '✅ План обновлён!',
      );

      await ctx.reply('📅 *Изменения внесены:*', {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              webAppButton('📅 Календарь питания', '/calendar'),
              webAppButton('🛒 Список покупок', '/shopping'),
            ],
          ],
        },
      });
    } catch (err) {
      console.error('Plan adjustment error:', err);
      await ctx.api.editMessageText(
        ctx.chat!.id,
        thinking.message_id,
        '❌ Не удалось изменить план. Попробуйте ещё раз.',
      ).catch(() => {});
    } finally {
      inFlight.delete(userId);
    }
  })();
}
