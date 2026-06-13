import fs from 'fs';
import path from 'path';

// Аналитика хранится в одном JSON-файле рядом с данными пользователей.
// Только Node.js fs/path — без внешних библиотек.
const FILE = path.join(process.cwd(), 'user_data', 'analytics.json');

interface DayStats {
  date: string;
  users: number[];
  hours: Record<string, number>;
  events: Record<string, number>;
}

interface Analytics {
  days: Record<string, DayStats>;
}

// ── Внутренние load/save ─────────────────────────────────────
function load(): Analytics {
  try {
    const raw = fs.readFileSync(FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (data && typeof data === 'object' && data.days) return data as Analytics;
  } catch {
    // файла нет или повреждён — начинаем с пустого
  }
  return { days: {} };
}

function save(data: Analytics): void {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('analytics save failed:', err);
  }
}

// ── Время в МСК (UTC+3) ──────────────────────────────────────
// Даты и пиковые часы считаем по московскому времени, а не UTC.
function moscowParts(d: Date = new Date()): { date: string; hour: number } {
  const msk = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  return { date: msk.toISOString().slice(0, 10), hour: msk.getUTCHours() };
}

function shiftDate(dateStr: string, deltaDays: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function ensureDay(data: Analytics, date: string): DayStats {
  if (!data.days[date]) {
    data.days[date] = { date, users: [], hours: {}, events: {} };
  }
  return data.days[date];
}

// Русская плюрализация: [1, 2, 5] → пользователь / пользователя / пользователей
function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

// ── Публичные функции трекинга ───────────────────────────────
export function trackUser(userId: number): void {
  try {
    const { date, hour } = moscowParts();
    const data = load();
    const day = ensureDay(data, date);

    let changed = false;
    if (!day.users.includes(userId)) {
      day.users.push(userId);
      changed = true;
    }
    const hourKey = String(hour);
    day.hours[hourKey] = (day.hours[hourKey] ?? 0) + 1;
    changed = true;

    if (changed) save(data);
  } catch (err) {
    console.error('trackUser failed:', err);
  }
}

// Универсальный счётчик событий. Ключ: `event:store` либо просто `event`.
export function trackEvent(_userId: number, event: string, store?: string): void {
  try {
    const { date } = moscowParts();
    const data = load();
    const day = ensureDay(data, date);
    const key = store ? `${event}:${store}` : event;
    day.events[key] = (day.events[key] ?? 0) + 1;
    save(data);
  } catch (err) {
    console.error('trackEvent failed:', err);
  }
}

// ── Отчёты ───────────────────────────────────────────────────
export function getStats(): string {
  const data = load();
  const dates = Object.keys(data.days).sort(); // по возрастанию

  // Всего уникальных за всё время
  const allUsers = new Set<number>();
  for (const d of dates) for (const u of data.days[d].users) allUsers.add(u);

  const today = moscowParts().date;
  const yesterday = shiftDate(today, -1);
  const dayBefore = shiftDate(today, -2);

  const usersOn = (date: string): number[] => data.days[date]?.users ?? [];

  // Новые / вернувшиеся сегодня
  const seenBeforeToday = new Set<number>();
  for (const d of dates) {
    if (d < today) for (const u of data.days[d].users) seenBeforeToday.add(u);
  }
  const todayUsers = usersOn(today);
  const newToday = todayUsers.filter((u) => !seenBeforeToday.has(u)).length;
  const returningToday = todayUsers.length - newToday;

  const lines: string[] = [];
  lines.push('📊 *Статистика бота*');
  lines.push('');
  lines.push(`👥 Всего уникальных пользователей: *${allUsers.size}*`);
  lines.push('');
  lines.push(`📅 Сегодня (${today}): *${todayUsers.length}*`);
  lines.push(`   🆕 Новых: *${newToday}* / 🔄 Вернулись: *${returningToday}*`);
  lines.push('');
  lines.push(`📅 Вчера (${yesterday}): *${usersOn(yesterday).length}*`);
  lines.push('');
  lines.push(`📅 Позавчера (${dayBefore}): *${usersOn(dayBefore).length}*`);
  lines.push('');

  // Пиковые часы сегодня — топ-3
  lines.push('🕐 *Пиковые часы сегодня:*');
  lines.push('');
  const hours = data.days[today]?.hours ?? {};
  const topHours = Object.entries(hours)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  if (topHours.length === 0) {
    lines.push('Пока нет данных');
  } else {
    for (const [hour, count] of topHours) {
      const hh = String(hour).padStart(2, '0');
      lines.push(`${hh}:00 — ${count} ${plural(count, ['пользователь', 'пользователя', 'пользователей'])}`);
    }
  }

  return lines.join('\n');
}

export function buildCsv(): string {
  const data = load();
  const dates = Object.keys(data.days).sort(); // по возрастанию для подсчёта новых

  const seen = new Set<number>();
  const rows: Array<{ date: string; unique: number; nw: number; ret: number }> = [];
  for (const date of dates) {
    const users = data.days[date].users;
    let nw = 0;
    for (const u of users) if (!seen.has(u)) nw++;
    for (const u of users) seen.add(u);
    rows.push({ date, unique: users.length, nw, ret: users.length - nw });
  }
  rows.reverse(); // новые сверху

  const header = 'date,unique_users,new_users,returning_users';
  const body = rows.map((r) => `${r.date},${r.unique},${r.nw},${r.ret}`);
  return [header, ...body].join('\n');
}
