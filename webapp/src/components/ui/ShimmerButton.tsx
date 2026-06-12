import { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

interface ShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
}

export function ShimmerButton({
  children,
  shimmerColor = '#ffffff',
  shimmerSize = '0.05em',
  borderRadius = '14px',
  shimmerDuration = '3s',
  background = 'var(--tg-theme-button-color, #2481cc)',
  className = '',
  style,
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      style={
        {
          '--shimmer-color': shimmerColor,
          '--shimmer-size': shimmerSize,
          '--border-radius': borderRadius,
          '--shimmer-duration': shimmerDuration,
          '--background': background,
          '--spread': '90deg',
          ...style,
        } as CSSProperties
      }
      className={`shimmer-button ${className}`}
      {...props}
    >
      <span className="shimmer-button__shimmer" />
      <span className="shimmer-button__content">{children}</span>
    </button>
  );
}
