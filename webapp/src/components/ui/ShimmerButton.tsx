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
  shimmerColor = '#34d399',
  shimmerSize = '8%',
  borderRadius = '16px',
  shimmerDuration = '3s',
  background = 'var(--bg-elev, #161620)',
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
