import { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useSpring } from 'framer-motion';

interface NumberTickerProps {
  value: number;
  delay?: number;
  decimalPlaces?: number;
  className?: string;
}

export function NumberTicker({ value, delay = 0, decimalPlaces = 0, className = '' }: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 });
  const isInView = useInView(ref, { once: true, margin: '0px' });

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => motionValue.set(value), delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [isInView, delay, value, motionValue]);

  useEffect(() => {
    return springValue.on('change', (v) => {
      if (ref.current) {
        ref.current.textContent = Intl.NumberFormat('ru-RU', {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        }).format(Number(v.toFixed(decimalPlaces)));
      }
    });
  }, [springValue, decimalPlaces]);

  return <span ref={ref} className={className}>0</span>;
}
