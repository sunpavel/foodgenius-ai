import OpenAI from 'openai';
import { UserPreferences, MealPlan, Meal, DayPlan } from '../types/user';

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

const DAY_LABELS: Record<string, string> = {
  mon: 'понедельник', tue: 'вторник', wed: 'среда', thu: 'четверг',
  fri: 'пятница', sat: 'суббота', sun: 'воскресенье',
};

function buildPrompt(
  prefs: UserPreferences,
  adjustment?: string,
  currentPlan?: MealPlan,
  dislikedDishes: string[] = [],
): string {
  const sportsBlock = prefs.activityLevel && prefs.activityLevel !== 'none'
    ? `
СПОРТ И НАГРУЗКИ: ${ACTIVITY_HINT[prefs.activityLevel]}
Виды спорта: ${prefs.sports?.join(', ') || 'не указаны'}. Тренировок в неделю: ${prefs.trainingsPerWeek ?? 3}.
Добавь больше высокобелковых блюд: курица, индейка, рыба, творог, яйца, бобовые. Белок должен быть в каждом приёме пищи.`
    : '';

  const goalHint = prefs.goal === 'lose_weight'
    ? `\nЦЕЛЬ ПОЛЬЗОВАТЕЛЯ: похудеть на ${prefs.goalKg ?? '?'} кг. Калорийность: на 300–400 ккал ниже нормы. Акцент на белок, клетчатку, минимум быстрых углеводов.`
    : prefs.goal === 'gain_muscle'
    ? `\nЦЕЛЬ ПОЛЬЗОВАТЕЛЯ: набрать мышечную массу на ${prefs.goalKg ?? '?'} кг. Калорийность: на 300–400 ккал выше нормы. Максимум белка в каждом приёме пищи.`
    : prefs.goal === 'maintain'
    ? `\nЦЕЛЬ ПОЛЬЗОВАТЕЛЯ: поддерживать текущий вес. Сбалансированное питание.`
    : '';

  const trainingDaysHint = prefs.activityDays?.length
    ? `\nДНИ ТРЕНИРОВОК: ${prefs.activityDays.map((d) => DAY_LABELS[d] ?? d).join(', ')}. В эти дни: сложные углеводы утром (каши, хлеб), белковое блюдо на обед и ужин. В дни отдыха: чуть легче по калориям, больше овощей.`
    : '';

  const dislikedBlock = dislikedDishes.length
    ? `\nНЕ ПРЕДЛАГАЙ эти блюда и похожие на них (пользователю не понравились): ${dislikedDishes.join(', ')}.`
    : '';

  const base = `Ты — профессиональный планировщик семейного питания.
Создай план питания на неделю (7 дней, monday–sunday) для семьи из ${prefs.householdSize} чел.

Диетические ограничения: ${prefs.dietaryRestrictions.join(', ') || 'нет'}
Бюджет: ${BUDGET_HINT[prefs.budgetLevel] ?? prefs.budgetLevel}${prefs.cookingFrequency ? `\nЧастота готовки: ${FREQUENCY_HINT[prefs.cookingFrequency] ?? prefs.cookingFrequency}` : ''}${goalHint}${sportsBlock}${trainingDaysHint}${dislikedBlock}

Требования:
- Завтрак, обед и ужин на каждый день, без повторов блюд в течение недели
- РАЗНООБРАЗИЕ: чередуй техники (запекание, тушение, гриль, варка), разные гарниры и источники белка; не зацикливайся на «типовых» блюдах
- Для каждого блюда подбери один подходящий emoji (поле "emoji")
- Для каждого блюда укажи КБЖУ на порцию: calories (ккал), protein/fat/carbs (граммы)
- Ингредиенты указывай с количеством на ${prefs.householdSize} чел.
- Инструкции — 4–6 подробных шагов: указывай температуру духовки, время приготовления каждого этапа, консистенцию готовности
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

export async function generateMealPlan(
  prefs: UserPreferences,
  previousPlan?: MealPlan,
  dislikedDishes: string[] = [],
): Promise<MealPlan> {
  const completion = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: buildPrompt(prefs, undefined, previousPlan, dislikedDishes) }],
    response_format: { type: 'json_object' },
    temperature: 1.0,
  });

  return JSON.parse(completion.choices[0].message.content!) as MealPlan;
}

// Заменить одно блюдо в дне, не трогая остальные
export async function replaceSingleMeal(
  prefs: UserPreferences,
  dayPlan: DayPlan,
  meal: 'breakfast' | 'lunch' | 'dinner',
  dislikedDishes: string[] = [],
): Promise<Meal> {
  const mealLabel = meal === 'breakfast' ? 'завтрак' : meal === 'lunch' ? 'обед' : 'ужин';
  const otherMeals = (['breakfast', 'lunch', 'dinner'] as const)
    .filter((m) => m !== meal)
    .map((m) => dayPlan[m]?.name)
    .filter(Boolean);

  const goalHint = prefs.goal === 'lose_weight'
    ? 'Цель: похудение — пониженная калорийность, упор на белок и клетчатку.'
    : prefs.goal === 'gain_muscle'
    ? 'Цель: набор массы — повышенная калорийность, максимум белка.'
    : 'Цель: поддержание веса — сбалансированно.';

  const prompt = `Придумай одно новое блюдо на ${mealLabel} для семьи из ${prefs.householdSize} чел.
${goalHint}
Диетические ограничения: ${prefs.dietaryRestrictions.join(', ') || 'нет'}
Бюджет: ${BUDGET_HINT[prefs.budgetLevel] ?? prefs.budgetLevel}
Текущее блюдо (его нужно заменить на ДРУГОЕ): ${dayPlan[meal]?.name ?? '—'}
Не повторяй блюда этого дня: ${otherMeals.join(', ') || '—'}.${dislikedDishes.length ? `\nНе предлагай и не повторяй (не понравились): ${dislikedDishes.join(', ')}.` : ''}

Верни ТОЛЬКО валидный JSON одного блюда:
{"name": "...", "emoji": "🍽", "cookTime": "20 мин", "difficulty": "easy", "calories": 400, "protein": 25, "fat": 12, "carbs": 40, "ingredients": ["..."], "instructions": ["шаг 1", "шаг 2", "шаг 3", "шаг 4"]}`;

  const completion = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 1.0,
  });

  return JSON.parse(completion.choices[0].message.content!) as Meal;
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
