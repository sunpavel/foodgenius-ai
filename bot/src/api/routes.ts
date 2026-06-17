import { Router, Request, Response } from 'express';
import {
  loadUserData, saveUserData, updateLastActive,
  calculateDailyKcal, generateReferralCode, getTodayFromPlan, getAllUserIds,
} from '../data/user-storage';
import { validateTelegramWebAppData, extractUserIdFromInitData } from '../utils/validation';
import { generateMealPlan, replaceSingleMeal } from '../ai/meal-planner';
import { UserPreferences, WeekDay } from '../types/user';

export function createRouter(): Router {
  const router = Router();

  // Диагностика конфигурации (без секретов)
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      openaiKey: Boolean(process.env.OPENAI_API_KEY),
      botToken: Boolean(process.env.BOT_TOKEN),
      publicUrl: process.env.RAILWAY_PUBLIC_DOMAIN ?? process.env.WEBHOOK_URL ?? null,
      uptime: Math.round(process.uptime()),
    });
  });

  function getUserId(req: Request): number | null {
    const auth = req.headers.authorization ?? '';
    const initData = auth.replace(/^tma\s+/, '');
    if (!initData) return null;

    const botToken = process.env.BOT_TOKEN ?? '';
    // In dev mode skip validation
    if (process.env.NODE_ENV !== 'production' || validateTelegramWebAppData(initData, botToken)) {
      return extractUserIdFromInitData(initData);
    }
    return null;
  }

  // Единый резолвер userId: подпись Telegram или ?userId= в dev-режиме
  function resolveUserId(req: Request): number | null {
    const fromAuth = getUserId(req);
    if (fromAuth) return fromAuth;
    if (process.env.NODE_ENV !== 'production') {
      return Number(req.query.userId) || Number(req.body?.userId) || null;
    }
    return null;
  }

  // Текущий день недели в коде mon..sun
  function todayWeekDay(): WeekDay {
    const map: WeekDay[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return map[new Date().getDay()];
  }

  // Save user preferences
  router.post('/user/preferences', async (req: Request, res: Response) => {
    try {
      const userId = resolveUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      // Отделяем поля уровня UserData от полей предпочтений
      const { onboardingDone, userId: _ignore, ...prefs } = req.body ?? {};
      const preferences = prefs as UserPreferences;

      const existing = await loadUserData(userId);
      const referralCode = existing?.referralCode ?? generateReferralCode();
      const dailyGoalKcal = calculateDailyKcal(preferences);

      await saveUserData(userId, {
        preferences,
        referralCode,
        dailyGoalKcal,
        lastActive: new Date().toISOString(),
        ...(onboardingDone !== undefined ? { onboardingDone: Boolean(onboardingDone) } : {}),
      });
      res.json({ ok: true, referralCode, dailyGoalKcal });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Get user data
  router.get('/user/me', async (req: Request, res: Response) => {
    try {
      const userId = resolveUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const data = await loadUserData(userId);
      res.json(data ?? { userId });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Пинг активности — обновить lastActive при открытии Mini App
  router.post('/user/ping', async (req: Request, res: Response) => {
    try {
      const userId = resolveUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      await updateLastActive(userId);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Асинхронная генерация: запускаем в фоне, сразу отвечаем pending.
  // Клиент не ждёт 60–90с на месте, а уходит на календарь со скелетоном
  // и поллит /generate-status. Результат пишется на Volume в любом случае.
  type Job = { status: 'pending' | 'ready' | 'error'; error?: string };
  const jobs = new Map<number, Job>();

  router.post('/user/generate-plan', async (req: Request, res: Response) => {
    try {
      const userId = resolveUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const data = await loadUserData(userId);
      if (!data?.preferences) return res.status(400).json({ error: 'No preferences' });

      // Уже генерируется — не дублируем (защита от спама и лишних вызовов OpenAI)
      if (jobs.get(userId)?.status === 'pending') {
        return res.json({ status: 'pending' });
      }

      jobs.set(userId, { status: 'pending' });
      res.json({ status: 'pending' }); // отвечаем сразу, генерация — ниже в фоне

      void (async () => {
        try {
          const mealPlan = await generateMealPlan(
            data.preferences!, data.mealPlan, data.dislikedDishes ?? [],
          );
          await saveUserData(userId, { mealPlan, lastActive: new Date().toISOString() });
          jobs.set(userId, { status: 'ready' });
        } catch (err) {
          console.error('Webapp plan generation error:', err);
          jobs.set(userId, { status: 'error', error: String(err) });
        }
      })();
    } catch (err) {
      console.error('generate-plan error:', err);
      res.status(500).json({ error: String(err) });
    }
  });

  // Статус фоновой генерации
  router.get('/user/generate-status', async (req: Request, res: Response) => {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    res.json({ status: jobs.get(userId)?.status ?? 'idle' });
  });

  // Get meal plan
  router.get('/user/meal-plan', async (req: Request, res: Response) => {
    try {
      const userId = resolveUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      // lastActive обновляется через /user/ping при открытии приложения — здесь не дублируем
      const data = await loadUserData(userId);
      if (!data?.mealPlan) return res.status(404).json({ error: 'No meal plan' });
      res.json(data.mealPlan);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Заменить одно блюдо. Body: { dayIndex: number, meal: 'breakfast'|'lunch'|'dinner' }
  const replacing = new Set<number>();
  router.post('/user/replace-meal', async (req: Request, res: Response) => {
    let userId: number | null = null;
    try {
      userId = resolveUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { dayIndex, meal } = req.body ?? {};
      if (typeof dayIndex !== 'number' || !['breakfast', 'lunch', 'dinner'].includes(meal)) {
        return res.status(400).json({ error: 'Bad request' });
      }

      // Защита от спама заменами (= защита от лишних вызовов OpenAI)
      if (replacing.has(userId)) return res.status(429).json({ error: 'Already replacing' });
      replacing.add(userId);

      const data = await loadUserData(userId);
      const dayPlan = data?.mealPlan?.days?.[dayIndex];
      if (!data?.preferences || !data.mealPlan || !dayPlan) {
        return res.status(404).json({ error: 'No plan/day' });
      }

      const newMeal = await replaceSingleMeal(
        data.preferences, dayPlan, meal, data.dislikedDishes ?? [],
      );
      data.mealPlan.days[dayIndex][meal as 'breakfast' | 'lunch' | 'dinner'] = newMeal;
      await saveUserData(userId, { mealPlan: data.mealPlan });
      res.json(newMeal);
    } catch (err) {
      console.error('replace-meal error:', err);
      res.status(500).json({ error: String(err) });
    } finally {
      if (userId) replacing.delete(userId);
    }
  });

  // Лайк/дизлайк блюда. Body: { dishName: string, reaction: 'like'|'dislike' }
  router.post('/user/react', async (req: Request, res: Response) => {
    try {
      const userId = resolveUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { dishName, reaction } = req.body ?? {};
      if (typeof dishName !== 'string' || !['like', 'dislike', 'none'].includes(reaction)) {
        return res.status(400).json({ error: 'Bad request' });
      }

      // 'none' — снять реакцию: убираем из обоих списков
      const data = (await loadUserData(userId)) ?? { userId };
      let liked = (data.likedDishes ?? []).filter((d) => d !== dishName);
      let disliked = (data.dislikedDishes ?? []).filter((d) => d !== dishName);
      if (reaction === 'like') liked = [...liked, dishName];
      else if (reaction === 'dislike') disliked = [...disliked, dishName];

      await saveUserData(userId, { likedDishes: liked, dislikedDishes: disliked });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Прогресс к цели на сегодня
  router.get('/user/today-progress', async (req: Request, res: Response) => {
    try {
      const userId = resolveUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const data = await loadUserData(userId);
      if (!data?.mealPlan) return res.status(404).json({ error: 'No meal plan' });

      const today = getTodayFromPlan(data.mealPlan);
      const sum = (k: 'calories' | 'protein' | 'carbs' | 'fat') =>
        today ? (today.breakfast[k] || 0) + (today.lunch[k] || 0) + (today.dinner[k] || 0) : 0;

      const goal = data.preferences?.goal;
      const progressText = goal === 'lose_weight'
        ? 'Минус ~0.5 кг в неделю при таком меню'
        : goal === 'gain_muscle'
        ? 'Плюс ~0.5 кг мышц в неделю при таком рационе'
        : 'Поддерживаем форму — сбалансированный день';

      res.json({
        goalKcal: data.dailyGoalKcal ?? (data.preferences ? calculateDailyKcal(data.preferences) : 2000),
        todayKcal: sum('calories'),
        totalProtein: sum('protein'),
        totalCarbs: sum('carbs'),
        totalFat: sum('fat'),
        progressText,
        isTrainingDay: Boolean(data.preferences?.activityDays?.includes(todayWeekDay())),
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Метрики рефералов для контент-завода: сколько /start пришло по каждому коду (start_code роликов).
  // referredBy пишется в start.ts в верхнем регистре без префикса ref_ — это и есть start_code.
  router.get('/metrics/referrals', async (req: Request, res: Response) => {
    try {
      // Необязательная защита: если задан METRICS_TOKEN — требуем его в заголовке/запросе.
      const token = process.env.METRICS_TOKEN;
      if (token) {
        const provided = (req.headers['x-metrics-token'] as string) ?? (req.query.token as string) ?? '';
        if (provided !== token) return res.status(401).json({ error: 'Unauthorized' });
      }

      const ids = await getAllUserIds();
      const byCode: Record<string, number> = {};
      let totalReferred = 0;
      for (const id of ids) {
        const user = await loadUserData(id);
        const ref = user?.referredBy?.trim().toUpperCase();
        if (!ref) continue;
        byCode[ref] = (byCode[ref] || 0) + 1;
        totalReferred += 1;
      }

      const code = (req.query.code as string | undefined)?.trim().toUpperCase();
      if (code) {
        return res.json({ ok: true, code, bot_starts: byCode[code] ?? 0 });
      }
      return res.json({ ok: true, total_users: ids.length, total_referred: totalReferred, by_code: byCode });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  return router;
}
