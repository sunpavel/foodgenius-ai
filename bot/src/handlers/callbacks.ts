import { Context } from 'grammy';

export async function handleCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;

  if (data === 'how_it_works') {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `📖 *Как работает FoodGenius AI?*\n\n` +
      `1️⃣ *Настройте предпочтения* — семья, ограничения, кухни, бюджет\n` +
      `2️⃣ *AI создаёт план* — недельное меню с рецептами за 30 секунд\n` +
      `3️⃣ *Список покупок* — автоматически из плана, по категориям\n` +
      `4️⃣ *Готовьте по подсказкам* — /cook покажет сегодняшнее меню\n\n` +
      `Команды:\n/plan — новый план на неделю\n/cook — меню на сегодня\n/shop — список покупок\n/adjust — изменить план («/adjust замени ужин в среду»)`,
      { parse_mode: 'Markdown' },
    );
    return;
  }

  if (data === 'webapp_unavailable') {
    await ctx.answerCallbackQuery({
      text: 'Mini App станет доступен после публикации приложения (нужен HTTPS-адрес)',
      show_alert: true,
    });
    return;
  }

  await ctx.answerCallbackQuery('OK');
}
