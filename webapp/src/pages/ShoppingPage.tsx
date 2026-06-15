import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useConfetti } from '../components/ui/Confetti';
import { ShimmerButton } from '../components/ui/ShimmerButton';
import { CheckIcon, RotateIcon } from '../components/ui/Icon';
import { useTelegram } from '../hooks/useTelegram';
import { DEMO_PLAN } from '../data/demoPlan';
import { MealPlan } from '../types';

const CATS = [
  { key: 'produce' as const, label: 'Овощи и фрукты',     color: '#34d399' },
  { key: 'dairy'   as const, label: 'Молочные продукты',  color: '#22d3ee' },
  { key: 'meat'    as const, label: 'Мясо и рыба',        color: '#fb7185' },
  { key: 'pantry'  as const, label: 'Бакалея',            color: '#fbbf24' },
];

const JS_TO_KEY: Record<number, string> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
  4: 'thursday', 5: 'friday', 6: 'saturday',
};

function buildShoppingText(plan: MealPlan): string {
  return CATS
    .map(({ key, label }) => {
      const items = plan.shoppingList[key];
      if (!items.length) return '';
      return `${label}:\n${items.map((i) => `• ${i}`).join('\n')}`;
    })
    .filter(Boolean)
    .join('\n\n');
}

export default function ShoppingPage() {
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'today' | 'week'>('today');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const firedRef = useRef(false);
  const { tg, initData, getHeaders, getQueryUserId } = useTelegram();
  const { fire } = useConfetti();
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`/api/user/meal-plan${getQueryUserId()}`, { headers: getHeaders() })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setPlan)
      .catch(() => setPlan(initData ? null : DEMO_PLAN))
      .finally(() => setLoading(false));
  }, []);

  const totalItems = plan ? CATS.reduce((s, c) => s + plan.shoppingList[c.key].length, 0) : 0;
  const checkedCount = checked.size;
  const progress = totalItems ? Math.round((checkedCount / totalItems) * 100) : 0;

  useEffect(() => {
    if (progress === 100 && totalItems > 0 && !firedRef.current) {
      firedRef.current = true;
      fire();
    }
    if (progress < 100) firedRef.current = false;
  }, [progress, totalItems, fire]);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--card-border)', borderTopColor: 'var(--accent)' }} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '0 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🛒</div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Списка пока нет</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.5, marginTop: 8, marginBottom: 24 }}>
          Список покупок на неделю появится после создания меню
        </p>
        <div style={{ width: '100%', maxWidth: 320 }}>
          <ShimmerButton onClick={() => navigate('/setup')}>✨ Создать меню на неделю с AI</ShimmerButton>
        </div>
      </div>
    );
  }

  // Ингредиенты на сегодня
  const todayKey = JS_TO_KEY[new Date().getDay()];
  const todayDay = plan.days.find((d) => d.day === todayKey);
  const todayMeals = todayDay ? [todayDay.breakfast, todayDay.lunch, todayDay.dinner] : [];
  const todayIngredients = Array.from(new Set(todayMeals.flatMap((m) => m.ingredients ?? [])));

  function dishesWithIngredient(item: string): string[] {
    return todayMeals.filter((m) => (m.ingredients ?? []).includes(item)).map((m) => m.name);
  }

  function share() {
    const text = buildShoppingText(plan!);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => tg?.showAlert('Список скопирован! Вставь в любой чат 📋'))
        .catch(() => tg?.showAlert(text));
    } else {
      tg?.showAlert(text);
    }
  }

  return (
    <div style={{ padding: '20px 16px 0' }}>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 14 }}>
        Список <span className="gradient-text">покупок</span>
      </h1>

      {/* Табы */}
      <div className="seg" style={{ marginBottom: 16 }}>
        <button className={`seg-item ${tab === 'today' ? 'active' : ''}`} style={{ height: 44 }} onClick={() => setTab('today')}>На сегодня</button>
        <button className={`seg-item ${tab === 'week' ? 'active' : ''}`} style={{ height: 44 }} onClick={() => setTab('week')}>На неделю</button>
      </div>

      {/* ── ТАБ: НА СЕГОДНЯ ── */}
      {tab === 'today' && (
        <>
          {todayIngredients.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>На сегодня нет блюд в плане</p>
          ) : (
            <div className="glass" style={{ overflow: 'hidden', marginBottom: 16 }}>
              {todayIngredients.map((item, idx) => (
                <button key={item} onClick={() => { const u = dishesWithIngredient(item); if (u.length) tg?.showAlert(`Используется в:\n${u.join('\n')}`); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: 'var(--text)' }}>{item}</span>
                </button>
              ))}
            </div>
          )}
          <p style={{ textAlign: 'center', color: 'var(--faint)', fontSize: 12, marginBottom: 16 }}>
            Нажмите на продукт, чтобы увидеть в каком он блюде
          </p>
        </>
      )}

      {/* ── ТАБ: НА НЕДЕЛЮ ── */}
      {tab === 'week' && (
        <>
          {/* Прогресс */}
          <div className="glass" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Собрано</span>
              <span style={{ fontSize: 15, fontWeight: 700 }}>
                <span className="gradient-text">{checkedCount}</span>
                <span style={{ color: 'var(--faint)' }}> / {totalItems}</span>
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <motion.div animate={{ width: `${progress}%` }} transition={{ type: 'spring', damping: 22 }}
                style={{ height: '100%', borderRadius: 4, background: 'var(--gradient)', boxShadow: '0 0 12px var(--glow)' }} />
            </div>
            {checkedCount > 0 && progress < 100 && (
              <button onClick={() => setChecked(new Set())}
                style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--rose)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <RotateIcon size={13} /> Сбросить отметки
              </button>
            )}
          </div>

          {/* Поделиться */}
          <button className="btn btn-ghost" style={{ marginBottom: 16 }} onClick={share}>📤 Поделиться списком</button>

          {/* Completion banner */}
          {progress === 100 && (
            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="glass"
              style={{ padding: 24, marginBottom: 16, textAlign: 'center', background: 'rgba(52, 211, 153, 0.08)', borderColor: 'rgba(52, 211, 153, 0.3)', boxShadow: '0 0 40px -12px var(--glow)' }}>
              <div style={{ fontSize: 44, marginBottom: 6 }}>🎉</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent)' }}>Всё куплено!</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Неделя обеспечена — отличная работа</div>
            </motion.div>
          )}

          {/* Категории */}
          {CATS.map(({ key, label, color }) => {
            const items = plan.shoppingList[key];
            if (!items.length) return null;
            const catChecked = items.filter((item) => checked.has(`${key}:${item}`)).length;
            return (
              <div key={key} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px', marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
                  <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</span>
                  <span style={{ fontSize: 12, color: 'var(--faint)', marginLeft: 'auto', fontWeight: 600 }}>{catChecked}/{items.length}</span>
                </div>

                <div className="glass" style={{ overflow: 'hidden' }}>
                  {items.map((item, idx) => {
                    const id = `${key}:${item}`;
                    const done = checked.has(id);
                    return (
                      <button key={item} onClick={() => toggle(id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px', border: 'none', background: 'none', cursor: 'pointer', borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', textAlign: 'left' }}>
                        <motion.span animate={{ scale: done ? [1, 1.18, 1] : 1 }} transition={{ duration: 0.2 }}
                          style={{ width: 24, height: 24, borderRadius: 8, flexShrink: 0, border: done ? 'none' : `1.5px solid ${color}55`, background: done ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a0a0f', boxShadow: done ? `0 0 10px ${color}66` : 'none', transition: 'background 0.2s, border 0.2s' }}>
                          {done && <CheckIcon size={14} strokeWidth={3} />}
                        </motion.span>
                        <span style={{ fontSize: 14, color: done ? 'var(--faint)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none', transition: 'color 0.2s' }}>{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
