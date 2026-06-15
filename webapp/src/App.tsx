import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTelegram } from './hooks/useTelegram';
import { CalendarIcon, CartIcon, UserIcon } from './components/ui/Icon';
import SetupPage from './pages/SetupPage';
import CalendarPage from './pages/CalendarPage';
import ShoppingPage from './pages/ShoppingPage';

const TABS = [
  { path: '/calendar', Icon: CalendarIcon, label: 'Меню'    },
  { path: '/shopping', Icon: CartIcon,     label: 'Покупки' },
  { path: '/setup',    Icon: UserIcon,     label: 'Профиль' },
];

function GlassTabbar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        display: 'flex',
        background: 'rgba(10, 10, 15, 0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--card-border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {TABS.map(({ path, Icon, label }) => {
        const active = location.pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              flex: 1, height: 62, border: 'none', background: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              color: active ? 'var(--accent)' : 'var(--faint)',
              transition: 'color 0.2s',
              position: 'relative',
            }}
          >
            {active && (
              <motion.span
                layoutId="tab-glow"
                style={{
                  position: 'absolute', top: 0, width: 36, height: 3, borderRadius: '0 0 3px 3px',
                  background: 'var(--gradient)',
                  boxShadow: '0 2px 12px var(--glow)',
                }}
              />
            )}
            <Icon size={22} />
            <span style={{ fontSize: 11, fontWeight: active ? 700 : 500 }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--card-border)', borderTopColor: 'var(--accent)' }} />
    </div>
  );
}

function AppShell() {
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const { getHeaders, getQueryUserId } = useTelegram();
  const location = useLocation();

  useEffect(() => {
    // Пинг активности при каждом открытии
    fetch(`/api/user/ping${getQueryUserId()}`, { method: 'POST', headers: getHeaders() }).catch(() => {});
    // Загрузить профиль для проверки онбординга
    fetch(`/api/user/me${getQueryUserId()}`, { headers: getHeaders() })
      .then((r) => r.json())
      .then((d) => setOnboardingDone(Boolean(d?.onboardingDone)))
      .catch(() => setOnboardingDone(false));
  }, []);

  const showNav = location.pathname !== '/setup';
  if (onboardingDone === null) return <Spinner />;

  return (
    <div className="app-bg" style={{ minHeight: '100vh', position: 'relative' }}>
      <div style={{ position: 'relative', zIndex: 1, paddingBottom: showNav ? 84 : 0 }}>
        <Routes>
          <Route path="/" element={<Navigate to={onboardingDone ? '/calendar' : '/setup'} replace />} />
          <Route path="/setup"    element={<SetupPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/shopping" element={<ShoppingPage />} />
        </Routes>
      </div>
      {showNav && <GlassTabbar />}
    </div>
  );
}

export default function App() {
  const { tg } = useTelegram();

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      // Тёмная тема приложения — фиксируем цвета шапки Telegram под неё
      tg.setHeaderColor?.('#0a0a0f');
      tg.setBackgroundColor?.('#0a0a0f');
    }
  }, [tg]);

  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
