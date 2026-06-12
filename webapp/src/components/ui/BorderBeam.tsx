import { CSSProperties } from 'react';

interface BorderBeamProps {
  size?: number;
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
  className?: string;
}

export function BorderBeam({
  size = 200,
  duration = 8,
  colorFrom = '#34d399',
  colorTo = '#22d3ee',
  className = '',
}: BorderBeamProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 rounded-[inherit] ${className}`}
      style={
        {
          '--size': size,
          '--duration': duration,
          '--color-from': colorFrom,
          '--color-to': colorTo,
        } as CSSProperties
      }
    >
      <div className="border-beam-inner" />
    </div>
  );
}
