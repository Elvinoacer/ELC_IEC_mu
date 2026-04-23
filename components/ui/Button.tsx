'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  primary: 'bg-gradient-to-r from-brand-600 to-brand-700 text-white hover:from-brand-500 hover:to-brand-600 shadow-lg hover:shadow-brand-600/25',
  secondary: 'bg-gradient-to-r from-accent-500 to-accent-600 text-white hover:from-accent-400 hover:to-accent-500 shadow-lg hover:shadow-accent-500/25',
  outline: 'border border-glass-border text-brand-300 hover:bg-glass-hover hover:text-white',
  ghost: 'text-slate-400 hover:text-white hover:bg-glass-hover',
  danger: 'bg-gradient-to-r from-error-500 to-error-600 text-white hover:from-error-500/90 hover:to-error-600/90',
};

const sizeStyles: Record<string, string> = {
  xs: 'px-2 py-1 text-xs rounded-md',
  sm: 'px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg',
  md: 'px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm rounded-xl',
  lg: 'px-5 sm:px-7 py-2.5 sm:py-3.5 text-sm sm:text-base rounded-xl',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold transition-all duration-300 ease-out
        focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:ring-offset-2 focus:ring-offset-surface-900
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        active:scale-[0.97]
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
