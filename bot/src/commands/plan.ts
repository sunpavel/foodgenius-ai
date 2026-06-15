import { Context } from 'grammy';
import { generateMealPlan } from '../ai/meal-planner';
import { webAppButton } from '../utils/webapp';
import { loadUserData, saveUserData } from '../data/user-storage';

// Защита от дублей: Telegram ретраит webhook, если ответ не пришёл мгновенно
const inFlight = new Set<number>();

export async function planCommand(ctx: Context) {
  const userId = ctx.from!.id;

  if (inFlight.has(userId)) return;

  const userData = await loadUserData(userId);
  if (!userData?.preferences) {
    await ctx.reply('⚙️ Сначала настройте профиль:', {
      reply_markup: {
        inline_keyboard: [[webAppButton('⚙️ Настроить профиль', '/setup')]],
      },
    });
    return;
  }

  inFlight.add(userId);
  const thinking = await ctx.reply('🧠 Создаю персональный план питания...\n\nЭто займёт ~20 секунд ⏳');

  // Генерация идёт в фоне: webhook-ответ Telegram должен вернуться сразу,
  // иначе Telegram повторно шлёт ту же команду и генерации множатся.
  void (async () => {
    try {
      // Передаём прошлый план и нелюбимые блюда, чтобы новый их не повторял
      const mealPlan = await generateMealPlan(userData.preferences!, userData.mealPlan, userData.dislikedDishes ?? []);

      await saveUserData(userId, { mealPlan });

      await ctx.api.editMessageText(
        ctx.chat!.id,
        thinking.message_id,
        '✅ План готов! Открывайте календарь 👇',
      );

      const stats = mealPlan.weeklyStats;
      const statsText = stats
        ? `\n📊 _${stats.totalMeals} блюд, ~${stats.avgCalories} ккал/день_`
        : '';

      await ctx.reply(`📅 *Ваш план на неделю готов!*${statsText}`, {
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
      console.error('Plan generation error:', err);
      await ctx.api.editMessageText(
        ctx.chat!.id,
        thinking.message_id,
        '❌ Ошибка при создании плана. Попробуйте ещё раз: /plan',
      ).catch(() => {});
    } finally {
      inFlight.delete(userId);
    }
  })();
}
