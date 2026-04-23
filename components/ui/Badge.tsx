import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: 'bg-surface-600 text-slate-300',
  success: 'bg-success-500/15 text-success-500 border border-success-500/20',
  warning: 'bg-warning-500/15 text-warning-500 border border-warning-500/20',
  error: 'bg-error-500/15 text-error-500 border border-error-500/20',
  info: 'bg-brand-500/15 text-brand-400 border border-brand-500/20',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export default function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
