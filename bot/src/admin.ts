import { Bot, Context, InputFile, NextFunction } from 'grammy';
import { trackUser, getStats, buildCsv } from './analytics';

// Пустое/отсутствующее значение трактуем как «не задано» (Number('') === 0 нам не подходит)
function adminId(): number {
  const raw = process.env.ADMIN_TELEGRAM_ID;
  return raw && raw.trim() !== '' ? Number(raw) : NaN;
}

// Трекинг каждого апдейта. Ставится первым, до остальных middleware.
export async function analyticsMiddleware(ctx: Context, next: NextFunction): Promise<void> {
  if (ctx.from) trackUser(ctx.from.id);
  await next();
}

// Доступ только админу. Не-админам молча ничего не отвечаем.
export async function adminOnly(ctx: Context, next: NextFunction): Promise<void> {
  if (ctx.from?.id !== adminId()) return Promise.resolve();
  await next();
}

export function registerAdminCommands(bot: Bot): void {
  const id = adminId();
  if (isNaN(id)) {
    console.warn('⚠️  ADMIN_TELEGRAM_ID не задан — команды /stats и /export недоступны никому.');
  } else {
    console.log(`Admin commands enabled for ID ${id}`);
  }

  bot.command('stats', adminOnly, async (ctx) => {
    await ctx.reply(getStats(), { parse_mode: 'Markdown' });
  });

  bot.command('export', adminOnly, async (ctx) => {
    const csv = buildCsv();
    await ctx.replyWithDocument(new InputFile(Buffer.from(csv), 'stats.csv'));
  });
}
