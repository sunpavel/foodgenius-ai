import { Context } from 'grammy';
import { generateMealPlan } from '../ai/meal-planner';
import { webAppButton } from '../utils/webapp';
import { loadUserData, saveUserData } from '../data/user-storage';

export async function planCommand(ctx: Context) {
  const userId = ctx.from!.id;

  const userData = await loadUserData(userId);
  if (!userData?.preferences) {
    await ctx.reply('⚙️ Сначала настройте профиль:', {
      reply_markup: {
        inline_keyboard: [[webAppButton('⚙️ Настроить профиль', '/setup')]],
      },
    });
    return;
  }

  const thinking = await ctx.reply('🧠 Создаю персональный план питания...\n\nЭто займёт ~20 секунд ⏳');

  try {
    // Передаём прошлый план, чтобы новый не повторял те же блюда
    const mealPlan = await generateMealPlan(userData.preferences, userData.mealPlan);

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
      '❌ Ошибка при создании плана. Попробуйте позже или проверьте OPENAI_API_KEY.',
    );
  }
}
