import React, { ReactNode } from 'react';

interface AnimatedShinyTextProps {
  children: ReactNode;
  className?: string;
  shimmerWidth?: number;
}

export function AnimatedShinyText({ children, className = '', shimmerWidth = 100 }: AnimatedShinyTextProps) {
  return (
    <span
      className={`animated-shiny-text ${className}`}
      style={{ '--shimmer-width': `${shimmerWidth}px` } as React.CSSProperties}
    >
      {children}
    </span>
  );
}
