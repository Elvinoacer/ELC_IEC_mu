'use client';

import React from 'react';
import Input from './Input';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}

/**
 * Smart Phone Input for Kenya (+254)
 * - Automatically converts 07... to +2547...
 * - Automatically converts 01... to +2541...
 * - Automatically converts 254... to +254...
 * - Prevents non-numeric input (except leading +)
 */
export default function SmartPhoneInput({
  value,
  onChange,
  label = "Phone Number",
  placeholder = "+254 7XX XXX XXX",
  error,
  hint,
  required,
  disabled,
  className,
  autoFocus
}: PhoneInputProps) {

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    
    // 1. Handle deletion/empty
    if (!raw) {
      onChange('');
      return;
    }

    // 2. Allow typing +
    if (raw === '+') {
      onChange('+');
      return;
    }

    // 3. Logic for auto-formatting
    // If user starts with 0
    if (raw === '0') {
      onChange('+254');
      return;
    }

    // If user types 07 or 01
    if (raw === '07') {
      onChange('+2547');
      return;
    }
    if (raw === '01') {
      onChange('+2541');
      return;
    }

    // If user starts with 254 (without +)
    if (raw === '254') {
      onChange('+254');
      return;
    }

    // If user starts with 7 or 1 directly
    if (raw === '7' && value === '') {
      onChange('+2547');
      return;
    }
    if (raw === '1' && value === '') {
      onChange('+2541');
      return;
    }

    // Cleanup: keep digits and +
    const clean = raw.startsWith('+') 
      ? '+' + raw.slice(1).replace(/\D/g, '')
      : raw.replace(/\D/g, '');

    // Final normalization
    let final = clean;
    if (!final.startsWith('+')) {
      if (final.startsWith('0')) {
        final = '+254' + final.slice(1);
      } else if (final.startsWith('254')) {
        final = '+' + final;
      } else if (final.length > 0) {
        final = '+254' + final;
      }
    }

    // Limit length
    if (final.length > 13) {
      final = final.slice(0, 13);
    }

    onChange(final);
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-[10px] uppercase font-black tracking-[0.2em] text-slate-500 ml-1">
          {label} {required && <span className="text-brand-500">*</span>}
        </label>
      )}
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none border-r border-white/10 pr-3 mr-3 z-10">
          <span className="text-lg">🇰🇪</span>
        </div>
        <input
          type="tel"
          inputMode="tel"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          autoFocus={autoFocus}
          className={`
            w-full h-14 pl-16 pr-4 rounded-2xl bg-white/[0.03] border border-white/10 
            text-white font-bold tracking-wide placeholder:text-slate-600
            transition-all duration-300
            focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.05] focus:ring-4 focus:ring-brand-500/10
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-error-500/50 bg-error-500/[0.02]' : ''}
            ${className || ''}
          `}
        />
      </div>
      {hint && !error && <p className="text-[10px] text-slate-500 ml-1 font-medium italic">{hint}</p>}
      {error && <p className="text-[10px] text-error-400 ml-1 font-bold animate-shake">{error}</p>}
    </div>
  );
}
