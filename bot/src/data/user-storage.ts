import fs from 'fs/promises';
import path from 'path';
import { UserData, UserPreferences, MealPlan, DayPlan } from '../types/user';

const DATA_DIR = path.join(process.cwd(), 'user_data');

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

// Атомарная запись: пишем во временный файл и переименовываем.
// rename на одной ФС атомарен — читатели никогда не видят частичный JSON,
// а падение в момент записи не портит исходный файл.
async function atomicWrite(filePath: string, content: string): Promise<void> {
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, content);
  await fs.rename(tmp, filePath);
}

// Очередь записи на пользователя: сериализует read-modify-write,
// чтобы параллельные ping/react/generate не затирали друг друга.
const tails = new Map<number, Promise<unknown>>();
function enqueue<T>(userId: number, task: () => Promise<T>): Promise<T> {
  const prev = tails.get(userId) ?? Promise.resolve();
  const run = prev.then(task, task);
  const tail = run.then(() => {}, () => {});
  tails.set(userId, tail);
  tail.then(() => { if (tails.get(userId) === tail) tails.delete(userId); });
  return run;
}

export async function saveUserData(userId: number, data: Partial<UserData>): Promise<void> {
  return enqueue(userId, async () => {
    await ensureDir();
    const filePath = path.join(DATA_DIR, `${userId}.json`);
    let existing: UserData = { userId };
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      existing = JSON.parse(content);
    } catch {}
    const merged = { ...existing, ...data, userId };
    await atomicWrite(filePath, JSON.stringify(merged, null, 2));
  });
}

export async function loadUserData(userId: number): Promise<UserData | null> {
  try {
    const filePath = path.join(DATA_DIR, `${userId}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// Обновить отметку последней активности (вызывается при каждом открытии Mini App)
export async function updateLastActive(userId: number): Promise<void> {
  await saveUserData(userId, { lastActive: new Date().toISOString() });
}

// Был ли пользователь активен за последние N дней
export async function isActiveUser(userId: number, days = 3): Promise<boolean> {
  const data = await loadUserData(userId);
  if (!data?.lastActive) return false;
  const diff = (Date.now() - new Date(data.lastActive).getTime()) / 86400000;
  return diff <= days;
}

// Все userId (для cron-рассылок) — из имён файлов в user_data/
export async function getAllUserIds(): Promise<number[]> {
  const files = await fs.readdir(DATA_DIR).catch(() => [] as string[]);
  return files
    .filter((f) => f.endsWith('.json') && f !== 'analytics.json')
    .map((f) => Number(f.replace('.json', '')))
    .filter((id) => !isNaN(id));
}

// Суточная норма калорий по уровню активности и цели
export function calculateDailyKcal(prefs: UserPreferences): number {
  const base: Record<string, number> = { none: 1600, light: 1900, medium: 2200, high: 2600 };
  let kcal = base[prefs.activityLevel ?? 'none'] ?? 1900;
  if (prefs.goal === 'lose_weight') kcal -= 350;
  if (prefs.goal === 'gain_muscle') kcal += 350;
  return kcal;
}

// План на текущий день недели
export function getTodayFromPlan(mealPlan: MealPlan): DayPlan | null {
  const JS_TO_KEY: Record<number, string> = {
    0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
    4: 'thursday', 5: 'friday', 6: 'saturday',
  };
  const todayKey = JS_TO_KEY[new Date().getDay()];
  return mealPlan.days.find((d) => d.day === todayKey) ?? null;
}

// Короткий реферальный код
export function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
