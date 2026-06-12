declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        initDataUnsafe: {
          user?: { id: number; first_name: string; last_name?: string; username?: string };
        };
        colorScheme: 'light' | 'dark';
        themeParams: Record<string, string>;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        MainButton: {
          text: string;
          setText: (text: string) => void;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
          isVisible: boolean;
        };
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
          isVisible: boolean;
        };
        showAlert: (message: string, callback?: () => void) => void;
        showConfirm: (message: string, callback: (confirmed: boolean) => void) => void;
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        };
      };
    };
  }
}

export function useTelegram() {
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;
  const initData = tg?.initData ?? '';

  function getHeaders(): HeadersInit {
    return initData
      ? { 'Authorization': `tma ${initData}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' };
  }

  function getQueryUserId(): string {
    return user ? `?userId=${user.id}` : '?userId=0';
  }

  return { tg, user, initData, getHeaders, getQueryUserId };
}
