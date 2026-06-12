import { useCallback } from 'react';
import confetti from 'canvas-confetti';

export function useConfetti() {
  const fire = useCallback(() => {
    const defaults = { startVelocity: 25, spread: 60, ticks: 60, zIndex: 9999 };
    const count = 150;
    const origin = { x: 0.5, y: 0.6 };

    function shoot(particleRatio: number, opts: confetti.Options) {
      confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio), origin });
    }

    shoot(0.25, { spread: 26, startVelocity: 55 });
    shoot(0.2, { spread: 60 });
    shoot(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    shoot(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    shoot(0.1, { spread: 120, startVelocity: 45 });
  }, []);

  return { fire };
}
