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

function buildPrompt(prefs: UserPreferences, adjustment?: string, currentPlan?: MealPlan): string {
  const base = `Ты — профессиональный планировщик семейного питания.
Создай план питания на неделю (7 дней, monday–sunday) для семьи из ${prefs.householdSize} чел.

Диетические ограничения: ${prefs.dietaryRestrictions.join(', ') || 'нет'}
Предпочитаемые кухни: ${prefs.cuisinePreferences.join(', ') || 'любые'}
Бюджет: ${BUDGET_HINT[prefs.budgetLevel] ?? prefs.budgetLevel}
Частота готовки: ${FREQUENCY_HINT[prefs.cookingFrequency] ?? prefs.cookingFrequency}

Требования:
- Завтрак, обед и ужин на каждый день, без повторов блюд в течение недели
- Для каждого блюда подбери один подходящий emoji (поле "emoji")
- Для каждого блюда укажи КБЖУ на порцию: calories (ккал), protein/fat/carbs (граммы)
- Ингредиенты указывай с количеством на ${prefs.householdSize} чел.
- Инструкции — 2–4 коротких шага
- shoppingList — суммарный список продуктов на всю неделю по категориям, с количеством`;

  const adjustBlock = adjustment && currentPlan
    ? `\n\nТЕКУЩИЙ ПЛАН (измени его минимально, только по запросу пользователя, остальное сохрани как есть):\n${JSON.stringify(currentPlan)}\n\nЗАПРОС ПОЛЬЗОВАТЕЛЯ: ${adjustment}\nПересчитай shoppingList с учётом изменений.`
    : '';

  return `${base}${adjustBlock}

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

export async function generateMealPlan(prefs: UserPreferences): Promise<MealPlan> {
  const completion = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: buildPrompt(prefs) }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
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
