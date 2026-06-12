import { Context } from 'grammy';

// Инлайн-режим из ТЗ: @bot быстрый ужин → 3 варианта блюд для шаринга в чатах
const QUICK_MEALS: Record<string, Array<{ id: string; title: string; description: string }>> = {
  dinner: [
    { id: 'd1', title: 'Паста с томатами и базиликом', description: '15 минут · Легко' },
    { id: 'd2', title: 'Курица терияки с рисом', description: '20 минут · Средне' },
    { id: 'd3', title: 'Омлет с овощами и сыром', description: '10 минут · Легко' },
  ],
  breakfast: [
    { id: 'b1', title: 'Овсяная каша с ягодами', description: '10 минут · Легко' },
    { id: 'b2', title: 'Тосты с авокадо и яйцом', description: '15 минут · Легко' },
    { id: 'b3', title: 'Сырники со сметаной', description: '20 минут · Легко' },
  ],
  lunch: [
    { id: 'l1', title: 'Куриный суп с лапшой', description: '40 минут · Средне' },
    { id: 'l2', title: 'Тёплый салат с говядиной', description: '25 минут · Средне' },
    { id: 'l3', title: 'Плов с курицей', description: '50 минут · Средне' },
  ],
};

function matchCategory(query: string): keyof typeof QUICK_MEALS {
  if (/завтрак|breakfast|утро/.test(query)) return 'breakfast';
  if (/обед|lunch|суп/.test(query)) return 'lunch';
  return 'dinner';
}

export async function handleInlineQuery(ctx: Context) {
  const query = (ctx.inlineQuery?.query ?? '').toLowerCase();
  const meals = QUICK_MEALS[matchCategory(query)];

  const results = meals.map((meal) => ({
    type: 'article' as const,
    id: meal.id,
    title: meal.title,
    description: meal.description,
    input_message_content: {
      message_text: `🍽️ Идея от FoodGenius AI: *${meal.title}*\n⏱ ${meal.description}\n\nПолный план на неделю: /plan`,
      parse_mode: 'Markdown' as const,
    },
  }));

  await ctx.answerInlineQuery(results, { cache_time: 300 });
}
