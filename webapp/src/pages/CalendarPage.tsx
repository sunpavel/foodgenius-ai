import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NumberTicker } from '../components/ui/NumberTicker';
import { BorderBeam } from '../components/ui/BorderBeam';
import { ClockIcon, FlameIcon, ChevronDownIcon, BasketIcon, ChefHatIcon } from '../components/ui/Icon';
import { useTelegram } from '../hooks/useTelegram';
import { DEMO_PLAN } from '../data/demoPlan';
import { MealPlan, DayPlan, Meal } from '../types';

const DAY_SHORT: Record<string, string> = {
  monday: 'Пн', tuesday: 'Вт', wednesday: 'Ср',
  thursday: 'Чт', friday: 'Пт', saturday: 'Сб', sunday: 'Вс',
};
const DAY_FULL: Record<string, string> = {
  monday: 'Понедельник', tuesday: 'Вторник', wednesday: 'Среда',
  thursday: 'Четверг', friday: 'Пятница', saturday: 'Суббота', sunday: 'Воскресенье',
};
const JS_TO_KEY: Record<number, string> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
  4: 'thursday', 5: 'friday', 6: 'saturday',
};

const DIFFICULTY: Record<string, { label: string; color: string }> = {
  easy:   { label: 'легко',  color: 'var(--accent)' },
  medium: { label: 'средне', color: 'var(--amber)' },
  hard:   { label: 'сложно', color: 'var(--rose)' },
};

const MEAL_META = [
  { key: 'breakfast' as const, label: 'Завтрак', tint: 'rgba(251, 191, 36, 0.14)' },
  { key: 'lunch'     as const, label: 'Обед',    tint: 'rgba(52, 211, 153, 0.14)' },
  { key: 'dinner'    as const, label: 'Ужин',    tint: 'rgba(167, 139, 250, 0.14)' },
];

function TodayProgress() {
  const [data, setData] = useState<{
    goalKcal: number; todayKcal: number; totalProtein: number; totalCarbs: number; totalFat: number;
    progressText: string; isTrainingDay: boolean;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const { getHeaders, getQueryUserId } = useTelegram();

  useEffect(() => {
    fetch(`/api/user/today-progress${getQueryUserId()}`, { headers: getHeaders() })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return null;
  const pct = data.goalKcal ? Math.round((data.todayKcal / data.goalKcal) * 100) : 0;

  return (
    <motion.div className="glass glass-hover" onClick={() => setOpen((v) => !v)}
      style={{ padding: '12px 16px', marginBottom: 14, cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          {data.isTrainingDay ? '💪 ' : ''}{data.progressText}
        </span>
        <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {data.todayKcal} / {data.goalKcal} ккал
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
        <motion.div animate={{ width: `${Math.min(pct, 100)}%` }}
          style={{ height: '100%', borderRadius: 2, background: 'var(--gradient)' }} />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ paddingTop: 12, display: 'flex', gap: 16, fontSize: 13, flexWrap: 'wrap' }}>
              <span><span style={{ color: 'var(--accent)', fontWeight: 700 }}>Б</span> {data.totalProtein}г — как {Math.max(1, Math.round(data.totalProtein / 25))} куриных грудки</span>
              <span><span style={{ color: 'var(--amber)', fontWeight: 700 }}>У</span> {data.totalCarbs}г — энергия дня</span>
              <span><span style={{ color: 'var(--rose)', fontWeight: 700 }}>Ж</span> {data.totalFat}г</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MealCard({ label, tint, meal, delay, dayIndex, mealKey, onReplace }: {
  label: string; tint: string; meal: Meal; delay: number;
  dayIndex: number; mealKey: 'breakfast' | 'lunch' | 'dinner';
  onReplace: (mealKey: 'breakfast' | 'lunch' | 'dinner', newMeal: Meal) => void;
}) {
  const [open, setOpen] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [reacted, setReacted] = useState<'like' | 'dislike' | null>(null);
  const { tg, getHeaders, getQueryUserId } = useTelegram();
  const diff = meal.difficulty ? DIFFICULTY[meal.difficulty] : null;
  const hasRecipe = (meal.ingredients?.length || 0) > 0 || (meal.instructions?.length || 0) > 0;

  async function react(reaction: 'like' | 'dislike') {
    setReacted(reaction);
    tg?.HapticFeedback?.impactOccurred('light');
    await fetch(`/api/user/react${getQueryUserId()}`, {
      method: 'POST', headers: getHeaders(),
      body: JSON.stringify({ dishName: meal.name, reaction }),
    }).catch(() => {});
  }

  async function handleReplace() {
    setReplacing(true);
    tg?.HapticFeedback?.impactOccurred('medium');
    try {
      const r = await fetch(`/api/user/replace-meal${getQueryUserId()}`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ dayIndex, meal: mealKey }),
      });
      if (r.ok) {
        onReplace(mealKey, await r.json());
        tg?.HapticFeedback?.notificationOccurred('success');
      }
    } catch {
      // тихо игнорируем
    } finally {
      setReplacing(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      className="glass glass-hover"
      style={{ marginBottom: 12, overflow: 'hidden' }}
    >
      <button
        onClick={hasRecipe ? () => setOpen((v) => !v) : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 14, width: '100%',
          padding: 14, border: 'none', background: 'none', cursor: hasRecipe ? 'pointer' : 'default',
          textAlign: 'left', color: 'var(--text)',
        }}
      >
        {/* Dish tile */}
        <div style={{
          width: 56, height: 56, borderRadius: 16, flexShrink: 0,
          background: tint,
          border: '1px solid var(--card-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30,
        }}>
          {meal.emoji ?? '🍽'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 3 }}>
            {label}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.25 }}>{meal.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 5, color: 'var(--muted)', fontSize: 12 }}>
            {meal.cookTime && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <ClockIcon size={13} /> {meal.cookTime}
              </span>
            )}
            {meal.calories && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--amber)' }}>
                <FlameIcon size={13} /> {meal.calories}
              </span>
            )}
            {diff && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: diff.color }} />
                {diff.label}
              </span>
            )}
          </div>
          {(meal.protein != null || meal.fat != null || meal.carbs != null) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: 12, color: 'var(--muted)' }}>
              {meal.protein != null && (
                <span><span style={{ color: 'var(--accent)', fontWeight: 700 }}>Б</span> {meal.protein} г</span>
              )}
              {meal.fat != null && (
                <span><span style={{ color: 'var(--amber)', fontWeight: 700 }}>Ж</span> {meal.fat} г</span>
              )}
              {meal.carbs != null && (
                <span><span style={{ color: 'var(--accent-2)', fontWeight: 700 }}>У</span> {meal.carbs} г</span>
              )}
            </div>
          )}
        </div>

        {hasRecipe && (
          <motion.span animate={{ rotate: open ? 180 : 0 }} style={{ color: 'var(--faint)', flexShrink: 0 }}>
            <ChevronDownIcon size={18} />
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && hasRecipe && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {meal.ingredients && meal.ingredients.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 8 }}>
                    <BasketIcon size={14} /> ИНГРЕДИЕНТЫ
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {meal.ingredients.map((ing) => (
                      <span key={ing} style={{
                        fontSize: 12, padding: '5px 10px', borderRadius: 10,
                        background: 'var(--card)', border: '1px solid var(--card-border)', color: 'var(--text)',
                      }}>{ing}</span>
                    ))}
                  </div>
                </div>
              )}
              {meal.instructions && meal.instructions.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 8 }}>
                    <ChefHatIcon size={14} /> ПРИГОТОВЛЕНИЕ
                  </div>
                  {meal.instructions.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '4px 0' }}>
                      <span style={{
                        minWidth: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                        background: 'var(--gradient)', color: '#06241c',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                      }}>{i + 1}</span>
                      <span style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--text)' }}>{step}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Действия: лайк / дизлайк / заменить */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => react('like')} className="btn btn-ghost"
                  style={{ flex: 1, height: 40, fontSize: 15, opacity: reacted === 'like' ? 1 : 0.7, borderColor: reacted === 'like' ? 'var(--accent)' : undefined }}>👍</button>
                <button onClick={() => react('dislike')} className="btn btn-ghost"
                  style={{ flex: 1, height: 40, fontSize: 15, opacity: reacted === 'dislike' ? 1 : 0.7, borderColor: reacted === 'dislike' ? 'var(--rose)' : undefined }}>👎</button>
                <button onClick={handleReplace} className="btn btn-ghost" disabled={replacing}
                  style={{ flex: 2, height: 40, fontSize: 13 }}>
                  {replacing ? '⏳ Заменяю...' : '↻ Заменить'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function CalendarPage() {
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>(JS_TO_KEY[new Date().getDay()]);
  const { initData, getHeaders, getQueryUserId } = useTelegram();

  useEffect(() => {
    fetch(`/api/user/meal-plan${getQueryUserId()}`, { headers: getHeaders() })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setPlan)
      // Демо-план только вне Telegram (предпросмотр в браузере).
      // Внутри Telegram честно показываем «плана нет».
      .catch(() => setPlan(initData ? null : DEMO_PLAN))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '3px solid var(--card-border)', borderTopColor: 'var(--accent)',
          }}
        />
      </div>
    );
  }

  if (!plan) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '0 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🍳</div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Плана пока нет</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.5, marginTop: 8, marginBottom: 24 }}>
          AI соберёт меню на неделю под ваш профиль за ~30 секунд
        </p>
        <button
          className="btn btn-primary"
          style={{ maxWidth: 320, opacity: generating ? 0.7 : 1 }}
          disabled={generating}
          onClick={async () => {
            setGenerating(true);
            try {
              const r = await fetch(`/api/user/generate-plan${getQueryUserId()}`, { method: 'POST', headers: getHeaders() });
              if (!r.ok) throw new Error();
              setPlan(await r.json());
            } catch {
              setGenError(true);
            } finally {
              setGenerating(false);
            }
          }}
        >
          {generating ? 'Создаю план... ~30 сек' : '🚀 Сгенерировать план'}
        </button>
        {genError && (
          <p style={{ color: 'var(--rose)', fontSize: 13, marginTop: 12 }}>
            Не получилось — сначала заполните Профиль или отправьте /plan боту
          </p>
        )}
      </div>
    );
  }

  const todayKey = JS_TO_KEY[new Date().getDay()];
  const currentDayIndex = Math.max(0, plan.days.findIndex((d) => d.day === selectedDay));
  const currentDay: DayPlan | undefined = plan.days[currentDayIndex] ?? plan.days[0];
  const stats = plan.weeklyStats;

  function replaceMealInPlan(mealKey: 'breakfast' | 'lunch' | 'dinner', newMeal: Meal) {
    setPlan((prev) => {
      if (!prev) return prev;
      const days = prev.days.map((d, i) => (i === currentDayIndex ? { ...d, [mealKey]: newMeal } : d));
      return { ...prev, days };
    });
  }
  const dayCalories = currentDay
    ? (currentDay.breakfast.calories || 0) + (currentDay.lunch.calories || 0) + (currentDay.dinner.calories || 0)
    : 0;

  return (
    <div style={{ padding: '20px 16px 0' }}>
      {/* Hero header */}
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Меню <span className="gradient-text">на неделю</span>
        </h1>

        {stats && (
          <div className="stat-animate" style={{ display: 'flex', gap: 16, marginTop: 8, color: 'var(--muted)', fontSize: 13, fontWeight: 500 }}>
            <span><NumberTicker value={stats.totalMeals} className="gradient-text" /> блюд</span>
            <span>~<NumberTicker value={stats.avgCalories} className="gradient-text" /> ккал/день</span>
          </div>
        )}
      </div>

      {/* Прогресс к цели на сегодня */}
      <TodayProgress />

      {/* Day pills — равные, по центру */}
      <div className="seg" style={{ marginBottom: 18 }}>
        {plan.days.map((day) => {
          const isToday = day.day === todayKey;
          const isSelected = day.day === selectedDay;
          return (
            <button
              key={day.day}
              onClick={() => setSelectedDay(day.day)}
              className={`seg-item ${isSelected ? 'active' : ''}`}
              style={{ height: 52, gap: 3 }}
            >
              <span style={{ fontSize: 13, fontWeight: 700 }}>{DAY_SHORT[day.day]}</span>
              <span style={{
                width: 4, height: 4, borderRadius: '50%',
                background: isToday ? 'currentColor' : 'transparent',
              }} />
            </button>
          );
        })}
      </div>

      {/* Day card */}
      <AnimatePresence mode="wait">
        {currentDay && (
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            {/* Day summary strip */}
            <div className="glass" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', marginBottom: 14 }}>
              {currentDay.day === todayKey && <BorderBeam />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{DAY_FULL[currentDay.day] ?? currentDay.day}</span>
                {currentDay.day === todayKey && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                    color: 'var(--accent)', background: 'rgba(52,211,153,0.12)',
                    padding: '3px 9px', borderRadius: 8,
                  }}>
                    СЕГОДНЯ
                  </span>
                )}
              </div>
              {dayCalories > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--amber)', fontSize: 13, fontWeight: 600 }}>
                  <FlameIcon size={14} /> {dayCalories} ккал
                </span>
              )}
            </div>

            {MEAL_META.map(({ key, label, tint }, i) => (
              <MealCard key={`${selectedDay}-${key}`} label={label} tint={tint} meal={currentDay[key]} delay={i * 0.06}
                dayIndex={currentDayIndex} mealKey={key} onReplace={replaceMealInPlan} />
            ))}

            <p style={{ textAlign: 'center', color: 'var(--faint)', fontSize: 12, margin: '4px 0 16px' }}>
              Нажмите на блюдо, чтобы открыть рецепт
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
