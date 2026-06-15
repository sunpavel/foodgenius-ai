import { useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShimmerButton } from '../components/ui/ShimmerButton';
import {
  UsersIcon, WalletIcon, LeafIcon, FlameIcon,
  PlusIcon, MinusIcon, CheckIcon,
} from '../components/ui/Icon';
import { useTelegram } from '../hooks/useTelegram';
import { UserPreferences, WeekDay } from '../types';

const DIETARY = ['Вегетарианство', 'Веганство', 'Без глютена', 'Без молочных', 'Кето', 'Без морепродуктов', 'Без орехов'];
const SPORTS = ['Силовые', 'Бег', 'Фитнес', 'Плавание', 'Вело', 'Йога', 'Единоборства', 'Игровые виды', 'Экстрим'];

const GOALS = [
  { v: 'lose_weight', icon: '🔥', l: 'Похудеть' },
  { v: 'maintain',    icon: '⚖️', l: 'Держать вес' },
  { v: 'gain_muscle', icon: '💪', l: 'Набрать массу' },
] as const;

const GOAL_KG = [
  { l: 'до 3 кг', v: 3 },
  { l: '3–5 кг', v: 5 },
  { l: '5–10 кг', v: 10 },
  { l: '10+ кг', v: 15 },
];

const ACTIVITY = [
  { v: 'none',   l: 'Не занимаюсь',  hint: 'Обычное питание' },
  { v: 'light',  l: 'Лёгкая',        hint: '1–2 тренировки, прогулки' },
  { v: 'medium', l: 'Средняя',       hint: '3–4 тренировки в неделю' },
  { v: 'high',   l: 'Высокая',       hint: '5+ тренировок, серьёзные нагрузки' },
] as const;

const BUDGETS = [
  { v: 'low',    l: 'Экономный' },
  { v: 'medium', l: 'Средний' },
  { v: 'high',   l: 'Любой' },
] as const;

const DAYS: { code: WeekDay; label: string }[] = [
  { code: 'mon', label: 'Пн' }, { code: 'tue', label: 'Вт' }, { code: 'wed', label: 'Ср' },
  { code: 'thu', label: 'Чт' }, { code: 'fri', label: 'Пт' }, { code: 'sat', label: 'Сб' }, { code: 'sun', label: 'Вс' },
];

const DEFAULT: UserPreferences = {
  householdSize: 2,
  dietaryRestrictions: [],
  cookingFrequency: 'few_times_week',
  cuisinePreferences: [],
  budgetLevel: 'medium',
  activityLevel: 'none',
  sports: [],
  trainingsPerWeek: 3,
  goal: undefined,
  goalKg: undefined,
  activityDays: [],
};

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

function StepTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, color: 'var(--text)' }}>
      <span style={{ color: 'var(--accent)' }}>{icon}</span>
      <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>{children}</h2>
    </div>
  );
}

const GEN_STEPS = [
  'Анализирую ваш профиль...',
  'Подбираю блюда под цель...',
  'Считаю КБЖУ на каждый день...',
  'Собираю список покупок...',
  'Почти готово...',
];

type Phase = 'idle' | 'saving' | 'generating' | 'done' | 'error';

export default function SetupPage() {
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT);
  const [customDiet, setCustomDiet] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [genStep, setGenStep] = useState(0);
  const { tg, getHeaders, getQueryUserId } = useTelegram();
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`/api/user/me${getQueryUserId()}`, { headers: getHeaders() })
      .then((r) => r.json())
      .then((d) => { if (d.preferences) setPrefs({ ...DEFAULT, ...d.preferences }); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (phase !== 'generating') return;
    const t = setInterval(() => setGenStep((s) => (s + 1) % GEN_STEPS.length), 6000);
    return () => clearInterval(t);
  }, [phase]);

  function patch(p: Partial<UserPreferences>) {
    setPrefs((prev) => ({ ...prev, ...p }));
  }

  async function handleSave() {
    setPhase('saving');
    try {
      tg?.HapticFeedback?.impactOccurred('medium');
      const saveRes = await fetch(`/api/user/preferences${getQueryUserId()}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ...prefs, onboardingDone: true }),
      });
      if (!saveRes.ok) throw new Error('save failed');

      setPhase('generating');
      setGenStep(0);
      const genRes = await fetch(`/api/user/generate-plan${getQueryUserId()}`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!genRes.ok) throw new Error('generate failed');

      setPhase('done');
      tg?.HapticFeedback?.notificationOccurred('success');
      // Отметить активность
      fetch(`/api/user/ping${getQueryUserId()}`, { method: 'POST', headers: getHeaders() }).catch(() => {});
      setTimeout(() => navigate('/calendar'), 800);
    } catch {
      setPhase('error');
    }
  }

  const busy = phase === 'saving' || phase === 'generating' || phase === 'done';
  const canNext = step === 0 ? Boolean(prefs.goal) : true;

  return (
    <div style={{ padding: '20px 16px 0' }}>
      {/* Прогресс-бар шагов */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, padding: '0 4px' }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= step ? 'var(--gradient)' : 'rgba(255,255,255,0.1)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
        >
          {/* ШАГ 0 — Цель + бюджет */}
          {step === 0 && (
            <>
              <StepTitle icon={<FlameIcon size={20} />}>Какая твоя цель?</StepTitle>
              <div className="seg" style={{ marginBottom: 16 }}>
                {GOALS.map(({ v, icon, l }) => (
                  <button
                    key={v}
                    onClick={() => patch({ goal: v, ...(v === 'maintain' ? { goalKg: undefined } : {}) })}
                    className={`seg-item ${prefs.goal === v ? 'active' : ''}`}
                    style={{ height: 76 }}
                  >
                    <span style={{ fontSize: 24 }}>{icon}</span>
                    {l}
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {(prefs.goal === 'lose_weight' || prefs.goal === 'gain_muscle') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden', marginBottom: 16 }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)', margin: '4px 0 10px' }}>
                      На сколько кг?
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {GOAL_KG.map(({ l, v }) => (
                        <button key={l} onClick={() => patch({ goalKg: v })}
                          className={`chip ${prefs.goalKg === v ? 'active' : ''}`}>{l}</button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 10px', color: 'var(--muted)' }}>
                <WalletIcon size={15} />
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Бюджет</span>
              </div>
              <div className="seg">
                {BUDGETS.map(({ v, l }) => (
                  <button key={v} onClick={() => patch({ budgetLevel: v })}
                    className={`seg-item ${prefs.budgetLevel === v ? 'active' : ''}`} style={{ height: 48 }}>{l}</button>
                ))}
              </div>
            </>
          )}

          {/* ШАГ 1 — Исключения */}
          {step === 1 && (
            <>
              <StepTitle icon={<LeafIcon size={20} />}>Что исключаем?</StepTitle>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {DIETARY.map((opt) => (
                  <button key={opt} onClick={() => patch({ dietaryRestrictions: toggle(prefs.dietaryRestrictions, opt) })}
                    className={`chip ${prefs.dietaryRestrictions.includes(opt) ? 'active' : ''}`}>{opt}</button>
                ))}
                {prefs.dietaryRestrictions.filter((d) => !DIETARY.includes(d)).map((opt) => (
                  <button key={opt} onClick={() => patch({ dietaryRestrictions: toggle(prefs.dietaryRestrictions, opt) })}
                    className="chip active">{opt} ✕</button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <input
                  value={customDiet}
                  onChange={(e) => setCustomDiet(e.target.value)}
                  placeholder="Другое (напр. без свинины)"
                  style={{
                    flex: 1, height: 44, padding: '0 14px', borderRadius: 13, fontSize: 14,
                    background: 'var(--card)', border: '1px solid var(--card-border)', color: 'var(--text)', outline: 'none',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customDiet.trim()) {
                      patch({ dietaryRestrictions: [...prefs.dietaryRestrictions, customDiet.trim()] });
                      setCustomDiet('');
                    }
                  }}
                />
                <button
                  className="btn btn-ghost"
                  style={{ width: 56 }}
                  onClick={() => {
                    if (customDiet.trim()) {
                      patch({ dietaryRestrictions: [...prefs.dietaryRestrictions, customDiet.trim()] });
                      setCustomDiet('');
                    }
                  }}
                ><PlusIcon size={18} /></button>
              </div>

              <button className="btn btn-ghost" onClick={() => patch({ dietaryRestrictions: [] })}>
                Нет ограничений
              </button>
            </>
          )}

          {/* ШАГ 2 — Активность */}
          {step === 2 && (
            <>
              <StepTitle icon={<FlameIcon size={20} />}>Насколько ты активен?</StepTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ACTIVITY.map(({ v, l, hint }) => {
                  const active = prefs.activityLevel === v;
                  return (
                    <button key={v} onClick={() => patch({ activityLevel: v })}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, width: '100%', height: 56,
                        padding: '0 14px', borderRadius: 13, cursor: 'pointer', textAlign: 'left',
                        border: active ? '1px solid var(--accent)' : '1px solid var(--card-border)',
                        background: active ? 'rgba(52,211,153,0.10)' : 'rgba(255,255,255,0.02)',
                        boxShadow: active ? '0 0 20px -6px var(--glow)' : 'none', transition: 'all 0.18s',
                      }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        border: active ? 'none' : '1.5px solid var(--faint)',
                        background: active ? 'var(--gradient)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06241c',
                      }}>{active && <CheckIcon size={12} strokeWidth={3} />}</span>
                      <span style={{ flex: 1 }}>
                        <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: active ? 'var(--accent)' : 'var(--text)' }}>{l}</span>
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <AnimatePresence>
                {prefs.activityLevel !== 'none' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                    <div style={{ marginTop: 18 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>В какие дни тренируешься?</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {DAYS.map(({ code, label }) => (
                          <button key={code} onClick={() => patch({ activityDays: toggle(prefs.activityDays ?? [], code) })}
                            className={`chip ${(prefs.activityDays ?? []).includes(code) ? 'active' : ''}`}
                            style={{ flex: 1, padding: 0, height: 40 }}>{label}</button>
                        ))}
                      </div>

                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', margin: '18px 0 8px' }}>Тип тренировок</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {SPORTS.map((opt) => (
                          <button key={opt} onClick={() => patch({ sports: toggle(prefs.sports ?? [], opt) })}
                            className={`chip ${(prefs.sports ?? []).includes(opt) ? 'active' : ''}`}>{opt}</button>
                        ))}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>Тренировок в неделю</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <button onClick={() => patch({ trainingsPerWeek: Math.max(1, (prefs.trainingsPerWeek ?? 3) - 1) })} className="glass-hover"
                            style={{ width: 36, height: 36, borderRadius: 12, cursor: 'pointer', border: '1px solid var(--card-border)', background: 'var(--card)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MinusIcon size={15} /></button>
                          <motion.span key={prefs.trainingsPerWeek} initial={{ scale: 1.3, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="gradient-text" style={{ minWidth: 22, textAlign: 'center', fontWeight: 800, fontSize: 19 }}>{prefs.trainingsPerWeek}</motion.span>
                          <button onClick={() => patch({ trainingsPerWeek: Math.min(7, (prefs.trainingsPerWeek ?? 3) + 1) })}
                            style={{ width: 36, height: 36, borderRadius: 12, cursor: 'pointer', border: 'none', background: 'var(--gradient)', color: '#06241c', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px -4px var(--glow)' }}><PlusIcon size={15} /></button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* ШАГ 3 — Порции */}
          {step === 3 && (
            <>
              <StepTitle icon={<UsersIcon size={20} />}>На сколько человек готовим?</StepTitle>
              <div className="glass" style={{ padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>👨‍👩‍👧 Человек в семье</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <button onClick={() => patch({ householdSize: Math.max(1, prefs.householdSize - 1) })} className="glass-hover"
                      style={{ width: 40, height: 40, borderRadius: 13, cursor: 'pointer', border: '1px solid var(--card-border)', background: 'var(--card)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MinusIcon size={17} /></button>
                    <motion.span key={prefs.householdSize} initial={{ scale: 1.35, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} className="gradient-text" style={{ minWidth: 26, textAlign: 'center', fontWeight: 800, fontSize: 22 }}>{prefs.householdSize}</motion.span>
                    <button onClick={() => patch({ householdSize: Math.min(10, prefs.householdSize + 1) })}
                      style={{ width: 40, height: 40, borderRadius: 13, cursor: 'pointer', border: 'none', background: 'var(--gradient)', color: '#06241c', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px -4px var(--glow)' }}><PlusIcon size={17} /></button>
                  </div>
                </div>
              </div>

              {/* Сводка */}
              <div className="glass" style={{ padding: 16, marginBottom: 8, background: 'rgba(52,211,153,0.05)', borderColor: 'rgba(52,211,153,0.18)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 8 }}>ВАШ ПРОФИЛЬ</div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)' }}>
                  Цель: {GOALS.find((g) => g.v === prefs.goal)?.l ?? 'не выбрана'}{prefs.goalKg ? ` (~${prefs.goalKg} кг)` : ''} · {BUDGETS.find((b) => b.v === prefs.budgetLevel)?.l} бюджет · {prefs.householdSize} чел.
                  {prefs.activityLevel !== 'none' && (
                    <><br />Спорт: {ACTIVITY.find((a) => a.v === prefs.activityLevel)?.l.toLowerCase()}, {(prefs.activityDays ?? []).length} дн./нед</>
                  )}
                  {prefs.dietaryRestrictions.length > 0 && <><br />Без: {prefs.dietaryRestrictions.join(', ').toLowerCase()}</>}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Навигация */}
      <div style={{ display: 'flex', gap: 12, marginTop: 24, marginBottom: 16 }}>
        {step > 0 && !busy && (
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep((s) => s - 1)}>← Назад</button>
        )}
        {step < 3 ? (
          <button
            className="btn btn-primary"
            style={{ flex: 2, opacity: canNext ? 1 : 0.5 }}
            disabled={!canNext}
            onClick={() => setStep((s) => s + 1)}
          >Далее →</button>
        ) : (
          <div style={{ flex: 2 }}>
            <ShimmerButton onClick={handleSave} disabled={busy} background={phase === 'done' ? 'rgba(52,211,153,0.18)' : undefined}>
              {phase === 'done' ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)' }}><CheckIcon size={18} /> План готов!</span>
              ) : phase === 'generating' ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    style={{ width: 16, height: 16, borderRadius: '50%', display: 'inline-block', border: '2px solid var(--card-border)', borderTopColor: 'var(--accent)' }} />
                  Создаю план...
                </span>
              ) : phase === 'saving' ? 'Сохраняю...' : '✨ Создать меню'}
            </ShimmerButton>
          </div>
        )}
      </div>

      {phase === 'generating' && (
        <motion.p key={genStep} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, margin: '0 0 16px' }}>{GEN_STEPS[genStep]}</motion.p>
      )}
      {phase === 'error' && (
        <p style={{ textAlign: 'center', color: 'var(--rose)', fontSize: 13, margin: '0 0 16px' }}>
          Не получилось — попробуйте ещё раз или отправьте /plan боту
        </p>
      )}
    </div>
  );
}
