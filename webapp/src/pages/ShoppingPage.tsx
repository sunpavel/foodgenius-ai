import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useConfetti } from '../components/ui/Confetti';
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

export default function ShoppingPage() {
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const firedRef = useRef(false);
  const { initData, getHeaders, getQueryUserId } = useTelegram();
  const { fire } = useConfetti();

  useEffect(() => {
    fetch(`/api/user/meal-plan${getQueryUserId()}`, { headers: getHeaders() })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setPlan)
      // Демо-план только вне Telegram (предпросмотр в браузере)
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
        <div style={{ fontSize: 56, marginBottom: 16 }}>🛒</div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Списка пока нет</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.5, marginTop: 8 }}>
          Список покупок собирается из плана питания — отправьте боту <span className="gradient-text" style={{ fontWeight: 700 }}>/plan</span>
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 16px 0' }}>
      {/* Hero header */}
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 14 }}>
        Список <span className="gradient-text">покупок</span>
      </h1>

      {/* Progress card */}
      <div className="glass" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Собрано</span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>
            <span className="gradient-text">{checkedCount}</span>
            <span style={{ color: 'var(--faint)' }}> / {totalItems}</span>
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', damping: 22 }}
            style={{
              height: '100%', borderRadius: 4,
              background: 'var(--gradient)',
              boxShadow: '0 0 12px var(--glow)',
            }}
          />
        </div>
        {checkedCount > 0 && progress < 100 && (
          <button
            onClick={() => setChecked(new Set())}
            style={{
              marginTop: 12, display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, color: 'var(--rose)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            <RotateIcon size={13} /> Сбросить отметки
          </button>
        )}
      </div>

      {/* Completion banner */}
      {progress === 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass"
          style={{
            padding: 24, marginBottom: 16, textAlign: 'center',
            background: 'rgba(52, 211, 153, 0.08)',
            borderColor: 'rgba(52, 211, 153, 0.3)',
            boxShadow: '0 0 40px -12px var(--glow)',
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 6 }}>🎉</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent)' }}>Всё куплено!</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Неделя обеспечена — отличная работа</div>
        </motion.div>
      )}

      {/* Categories */}
      {CATS.map(({ key, label, color }) => {
        const items = plan.shoppingList[key];
        if (!items.length) return null;
        const catChecked = items.filter((item) => checked.has(`${key}:${item}`)).length;
        return (
          <div key={key} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px', marginBottom: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                {label}
              </span>
              <span style={{ fontSize: 12, color: 'var(--faint)', marginLeft: 'auto', fontWeight: 600 }}>
                {catChecked}/{items.length}
              </span>
            </div>

            <div className="glass" style={{ overflow: 'hidden' }}>
              {items.map((item, idx) => {
                const id = `${key}:${item}`;
                const done = checked.has(id);
                return (
                  <button
                    key={item}
                    onClick={() => toggle(id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                      padding: '12px 14px', border: 'none', background: 'none', cursor: 'pointer',
                      borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      textAlign: 'left',
                    }}
                  >
                    <motion.span
                      animate={{ scale: done ? [1, 1.18, 1] : 1 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                        border: done ? 'none' : `1.5px solid ${color}55`,
                        background: done ? color : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#0a0a0f',
                        boxShadow: done ? `0 0 10px ${color}66` : 'none',
                        transition: 'background 0.2s, border 0.2s',
                      }}
                    >
                      {done && <CheckIcon size={14} strokeWidth={3} />}
                    </motion.span>
                    <span style={{
                      fontSize: 14, color: done ? 'var(--faint)' : 'var(--text)',
                      textDecoration: done ? 'line-through' : 'none',
                      transition: 'color 0.2s',
                    }}>
                      {item}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
