import { Context } from 'grammy';
import { webAppButton } from '../utils/webapp';
import { loadUserData } from '../data/user-storage';
import { Meal } from '../types/user';

const DAY_NAMES: Record<string, string> = {
  monday: 'Понедельник',
  tuesday: 'Вторник',
  wednesday: 'Среда',
  thursday: 'Четверг',
  friday: 'Пятница',
  saturday: 'Суббота',
  sunday: 'Воскресенье',
};

const JS_DAY_TO_NAME: Record<number, string> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday',
  3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday',
};

const DIFFICULTY: Record<string, string> = {
  easy: 'легко', medium: 'средне', hard: 'сложно',
};

function mealLine(icon: string, label: string, meal: Meal): string {
  let line = `${icon} *${label}:* ${meal.name}`;
  const meta: string[] = [];
  if (meal.cookTime) meta.push(meal.cookTime);
  if (meal.difficulty) meta.push(DIFFICULTY[meal.difficulty] ?? meal.difficulty);
  if (meta.length) line += ` _(${meta.join(' · ')})_`;
  return line + '\n';
}

export async function cookCommand(ctx: Context) {
  const userId = ctx.from!.id;

  const userData = await loadUserData(userId);
  if (!userData?.mealPlan) {
    await ctx.reply('📋 Сначала создайте план питания: /plan');
    return;
  }

  const todayKey = JS_DAY_TO_NAME[new Date().getDay()];
  const todayPlan = userData.mealPlan.days.find((d) => d.day === todayKey);

  if (!todayPlan) {
    await ctx.reply('📅 Открыть полный план питания:', {
      reply_markup: {
        inline_keyboard: [[webAppButton('📅 Календарь', '/calendar')]],
      },
    });
    return;
  }

  const dayName = DAY_NAMES[todayKey] ?? todayKey;

  let msg = `🍳 *${dayName} — меню на сегодня*\n\n`;
  msg += mealLine('🌅', 'Завтрак', todayPlan.breakfast);
  msg += mealLine('☀️', 'Обед', todayPlan.lunch);
  msg += mealLine('🌙', 'Ужин', todayPlan.dinner);

  await ctx.reply(msg, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[webAppButton('📅 Рецепты и календарь', '/calendar')]],
    },
  });
}
