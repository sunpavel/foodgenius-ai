import OpenAI from 'openai';
import { UserPreferences, MealPlan } from '../types/user';

let openai: OpenAI | null = null;
function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  openai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

const FREQUENCY_HINT: Record<UserPreferences['cookingFrequency'], string> = {
  daily: 'готовят каждый день, блюда могут быть разнообразными',
  few_times_week: 'готовят 3–4 раза в неделю — планируй блюда с запасом на 2 дня (одно блюдо на обед и следующий день)',
  weekends: 'готовят только по выходным (meal prep) — блюда должны хорошо храниться 2–3 дня в холодильнике',
};

const BUDGET_HINT: Record<UserPreferences['budgetLevel'], string> = {
  low: 'экономный — простые доступные продукты (крупы, курица, сезонные овощи)',
  medium: 'средний — обычные продукты из супермаркета',
  high: 'без ограничений — можно рыбу, морепродукты, дорогие сыры',
};

const ACTIVITY_HINT: Record<string, string> = {
  light: 'лёгкая активность (1–2 тренировки в неделю) — слегка увеличь белок',
  medium: 'средняя активность (3–4 тренировки в неделю) — высокобелковый рацион (~1,6 г белка на кг веса), калорийность +10%',
  high: 'высокая активность (5+ тренировок в неделю) — спортивный рацион с упором на белок (~2 г на кг веса), калорийность +20%',
};

function buildPrompt(prefs: UserPreferences, adjustment?: string, currentPlan?: MealPlan): string {
  const sportsBlock = prefs.activityLevel && prefs.activityLevel !== 'none'
    ? `
СПОРТ И НАГРУЗКИ: ${ACTIVITY_HINT[prefs.activityLevel]}
Виды спорта: ${prefs.sports?.join(', ') || 'не указаны'}. Тренировок в неделю: ${prefs.trainingsPerWeek ?? 3}.
Добавь больше высокобелковых блюд: курица, индейка, рыба, творог, яйца, бобовые. Белок должен быть в каждом приёме пищи.`
    : '';

  const base = `Ты — профессиональный планировщик семейного питания.
Создай план питания на неделю (7 дней, monday–sunday) для семьи из ${prefs.householdSize} чел.

Диетические ограничения: ${prefs.dietaryRestrictions.join(', ') || 'нет'}
Предпочитаемые кухни: ${prefs.cuisinePreferences.join(', ') || 'любые'}
Бюджет: ${BUDGET_HINT[prefs.budgetLevel] ?? prefs.budgetLevel}
Частота готовки: ${FREQUENCY_HINT[prefs.cookingFrequency] ?? prefs.cookingFrequency}${sportsBlock}

Требования:
- Завтрак, обед и ужин на каждый день, без повторов блюд в течение недели
- РАЗНООБРАЗИЕ: чередуй техники (запекание, тушение, гриль, варка), разные гарниры и источники белка; не зацикливайся на «типовых» блюдах
- Для каждого блюда подбери один подходящий emoji (поле "emoji")
- Для каждого блюда укажи КБЖУ на порцию: calories (ккал), protein/fat/carbs (граммы)
- Ингредиенты указывай с количеством на ${prefs.householdSize} чел.
- Инструкции — 2–4 коротких шага
- shoppingList — суммарный список продуктов на всю неделю по категориям, с количеством`;

  const adjustBlock = adjustment && currentPlan
    ? `\n\nТЕКУЩИЙ ПЛАН (измени его минимально, только по запросу пользователя, остальное сохрани как есть):\n${JSON.stringify(currentPlan)}\n\nЗАПРОС ПОЛЬЗОВАТЕЛЯ: ${adjustment}\nПересчитай shoppingList с учётом изменений.`
    : '';

  // При повторной генерации запрещаем блюда из прошлого плана — иначе модель выдаёт одно и то же
  const previousDishes = !adjustment && currentPlan
    ? currentPlan.days.flatMap((d) => [d.breakfast?.name, d.lunch?.name, d.dinner?.name]).filter(Boolean)
    : [];
  const varietyBlock = previousDishes.length
    ? `\n\nЭти блюда были в прошлом плане — НЕ повторяй их, придумай другие:\n${previousDishes.join(', ')}`
    : '';

  return `${base}${adjustBlock}${varietyBlock}

Верни ТОЛЬКО валидный JSON (без markdown):
{
  "days": [
    {
      "day": "monday",
      "breakfast": {"name": "...", "emoji": "🥣", "cookTime": "15 мин", "difficulty": "easy", "calories": 400, "protein": 20, "fat": 12, "carbs": 50, "ingredients": ["Овсяные хлопья 100 г", "..."], "instructions": ["шаг 1", "шаг 2"]},
      "lunch": {...},
      "dinner": {...}
    }
  ],
  "shoppingList": {
    "produce": ["Томаты 1 кг", "..."],
    "dairy": ["..."],
    "meat": ["..."],
    "pantry": ["..."]
  },
  "weeklyStats": {
    "avgCalories": 2000,
    "totalMeals": 21
  }
}`;
}

export async function generateMealPlan(prefs: UserPreferences, previousPlan?: MealPlan): Promise<MealPlan> {
  const completion = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: buildPrompt(prefs, undefined, previousPlan) }],
    response_format: { type: 'json_object' },
    temperature: 1.0,
  });

  return JSON.parse(completion.choices[0].message.content!) as MealPlan;
}

export async function adjustMealPlan(
  prefs: UserPreferences,
  currentPlan: MealPlan,
  adjustment: string,
): Promise<MealPlan> {
  const completion = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: buildPrompt(prefs, adjustment, currentPlan) }],
    response_format: { type: 'json_object' },
    temperature: 0.5,
  });

  return JSON.parse(completion.choices[0].message.content!) as MealPlan;
}
