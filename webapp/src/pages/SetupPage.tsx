import { useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShimmerButton } from '../components/ui/ShimmerButton';
import { AnimatedShinyText } from '../components/ui/AnimatedShinyText';
import {
  UsersIcon, ClockIcon, WalletIcon, LeafIcon, SparklesIcon,
  PlusIcon, MinusIcon, CheckIcon,
} from '../components/ui/Icon';
import { useTelegram } from '../hooks/useTelegram';
import { UserPreferences } from '../types';

const DIETARY = ['Вегетарианство', 'Веганство', 'Без глютена', 'Без молочных', 'Кето', 'Без морепродуктов', 'Без орехов'];
const CUISINES = ['Русская', 'Итальянская', 'Азиатская', 'Средиземноморская', 'Мексиканская', 'Грузинская', 'Любые'];

const FREQUENCY = [
  { v: 'daily',          l: 'Каждый день',       hint: '21 блюдо в неделю' },
  { v: 'few_times_week', l: '3–4 раза в неделю', hint: 'Готовим с запасом' },
  { v: 'weekends',       l: 'По выходным',       hint: 'Meal prep на неделю' },
] as const;

const BUDGETS = [
  { v: 'low',    l: 'Экономный' },
  { v: 'medium', l: 'Средний' },
  { v: 'high',   l: 'Любой' },
] as const;

const DEFAULT: UserPreferences = {
  householdSize: 2,
  dietaryRestrictions: [],
  cookingFrequency: 'few_times_week',
  cuisinePreferences: [],
  budgetLevel: 'medium',
};

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

function Block({ icon, title, footer, children }: { icon: ReactNode; title: string; footer?: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px', marginBottom: 8, color: 'var(--muted)' }}>
        {icon}
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{title}</span>
      </div>
      <div className="glass" style={{ padding: 14 }}>
        {children}
      </div>
      {footer && (
        <p style={{ fontSize: 12, color: 'var(--faint)', margin: '6px 4px 0' }}>{footer}</p>
      )}
    </div>
  );
}

export default function SetupPage() {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { getHeaders, getQueryUserId } = useTelegram();
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`/api/user/me${getQueryUserId()}`, { headers: getHeaders() })
      .then((r) => r.json())
      .then((d) => { if (d.preferences) setPrefs({ ...DEFAULT, ...d.preferences }); })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(prefs),
      }).catch(() => {});
      setSaved(true);
      setTimeout(() => navigate('/calendar'), 900);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: '20px 16px 0' }}>
      {/* Hero header */}
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
          <span className="gradient-text">FoodGenius</span> AI
        </h1>
        <AnimatedShinyText className="" shimmerWidth={120}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>30 секунд — и план питания на неделю готов</span>
        </AnimatedShinyText>
      </div>

      {/* Размер семьи */}
      <Block icon={<UsersIcon size={15} />} title="Размер семьи" footer="Порции рассчитаем автоматически">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Человек в семье</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => setPrefs(p => ({ ...p, householdSize: Math.max(1, p.householdSize - 1) }))}
              className="glass-hover"
              style={{
                width: 40, height: 40, borderRadius: 13, cursor: 'pointer',
                border: '1px solid var(--card-border)', background: 'var(--card)', color: 'var(--text)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            ><MinusIcon size={17} /></button>
            <motion.span
              key={prefs.householdSize}
              initial={{ scale: 1.35, opacity: 0.4 }}
              animate={{ scale: 1, opacity: 1 }}
              className="gradient-text"
              style={{ minWidth: 26, textAlign: 'center', fontWeight: 800, fontSize: 22 }}
            >
              {prefs.householdSize}
            </motion.span>
            <button
              onClick={() => setPrefs(p => ({ ...p, householdSize: Math.min(10, p.householdSize + 1) }))}
              style={{
                width: 40, height: 40, borderRadius: 13, cursor: 'pointer', border: 'none',
                background: 'var(--gradient)', color: '#06241c',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px -4px var(--glow)',
              }}
            ><PlusIcon size={17} /></button>
          </div>
        </div>
      </Block>

      {/* Частота готовки */}
      <Block icon={<ClockIcon size={15} />} title="Как часто готовите?">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FREQUENCY.map(({ v, l, hint }) => {
            const active = prefs.cookingFrequency === v;
            return (
              <button
                key={v}
                onClick={() => setPrefs(p => ({ ...p, cookingFrequency: v }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%', height: 56,
                  padding: '0 14px', borderRadius: 13, cursor: 'pointer', textAlign: 'left',
                  border: active ? '1px solid var(--accent)' : '1px solid var(--card-border)',
                  background: active ? 'rgba(52,211,153,0.10)' : 'rgba(255,255,255,0.02)',
                  boxShadow: active ? '0 0 20px -6px var(--glow)' : 'none',
                  transition: 'all 0.18s',
                }}
              >
                <span style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  border: active ? 'none' : '1.5px solid var(--faint)',
                  background: active ? 'var(--gradient)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06241c',
                }}>
                  {active && <CheckIcon size={12} strokeWidth={3} />}
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: active ? 'var(--accent)' : 'var(--text)' }}>{l}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Block>

      {/* Бюджет */}
      <Block icon={<WalletIcon size={15} />} title="Бюджет на продукты">
        <div className="seg">
          {BUDGETS.map(({ v, l }) => (
            <button
              key={v}
              onClick={() => setPrefs(p => ({ ...p, budgetLevel: v }))}
              className={`seg-item ${prefs.budgetLevel === v ? 'active' : ''}`}
              style={{ height: 48 }}
            >
              {l}
            </button>
          ))}
        </div>
      </Block>

      {/* Ограничения */}
      <Block icon={<LeafIcon size={15} />} title="Диетические ограничения" footer="Можно пропустить, если нет ограничений">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {DIETARY.map((opt) => (
            <button
              key={opt}
              onClick={() => setPrefs(p => ({ ...p, dietaryRestrictions: toggle(p.dietaryRestrictions, opt) }))}
              className={`chip ${prefs.dietaryRestrictions.includes(opt) ? 'active' : ''}`}
            >{opt}</button>
          ))}
        </div>
      </Block>

      {/* Кухни */}
      <Block icon={<SparklesIcon size={15} />} title="Любимые кухни">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CUISINES.map((opt) => (
            <button
              key={opt}
              onClick={() => setPrefs(p => ({ ...p, cuisinePreferences: toggle(p.cuisinePreferences, opt) }))}
              className={`chip ${prefs.cuisinePreferences.includes(opt) ? 'active' : ''}`}
            >{opt}</button>
          ))}
        </div>
      </Block>

      {/* Сводка */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass"
        style={{ padding: 16, marginBottom: 16, background: 'rgba(52,211,153,0.05)', borderColor: 'rgba(52,211,153,0.18)' }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 8 }}>
          ВАШ ПРОФИЛЬ
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)' }}>
          {prefs.householdSize} чел. · {FREQUENCY.find(f => f.v === prefs.cookingFrequency)?.l} · {BUDGETS.find(b => b.v === prefs.budgetLevel)?.l} бюджет
          {prefs.dietaryRestrictions.length > 0 && <><br />Без: {prefs.dietaryRestrictions.join(', ').toLowerCase()}</>}
          {prefs.cuisinePreferences.length > 0 && <><br />Кухни: {prefs.cuisinePreferences.join(', ')}</>}
        </div>
      </motion.div>

      {/* Save CTA */}
      <ShimmerButton
        onClick={handleSave}
        disabled={saving || saved}
        background={saved ? 'rgba(52,211,153,0.18)' : undefined}
      >
        {saved ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)' }}>
            <CheckIcon size={18} /> Сохранено
          </span>
        ) : saving ? 'Сохраняю...' : 'Сохранить и спланировать неделю'}
      </ShimmerButton>
      <p style={{ textAlign: 'center', color: 'var(--faint)', fontSize: 12, margin: '10px 0 16px' }}>
        План генерируется командой /plan в боте
      </p>
    </div>
  );
}
