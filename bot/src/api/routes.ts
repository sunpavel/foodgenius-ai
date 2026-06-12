import { Router, Request, Response } from 'express';
import { loadUserData, saveUserData } from '../data/user-storage';
import { validateTelegramWebAppData, extractUserIdFromInitData } from '../utils/validation';

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

  // Save user preferences
  router.post('/user/preferences', async (req: Request, res: Response) => {
    try {
      let userId = getUserId(req);
      if (!userId && process.env.NODE_ENV !== 'production') {
        userId = req.body.userId ?? 0;
      }
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      await saveUserData(userId, { preferences: req.body });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Get user data
  router.get('/user/me', async (req: Request, res: Response) => {
    try {
      let userId = getUserId(req);
      if (!userId && process.env.NODE_ENV !== 'production') {
        userId = Number(req.query.userId) || 0;
      }
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const data = await loadUserData(userId);
      res.json(data ?? { userId });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Get meal plan
  router.get('/user/meal-plan', async (req: Request, res: Response) => {
    try {
      let userId = getUserId(req);
      if (!userId && process.env.NODE_ENV !== 'production') {
        userId = Number(req.query.userId) || 0;
      }
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const data = await loadUserData(userId);
      if (!data?.mealPlan) return res.status(404).json({ error: 'No meal plan' });
      res.json(data.mealPlan);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  return router;
}
