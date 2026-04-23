'use client';

import React, { useEffect, useMemo, useRef } from 'react';

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
}

export default function OtpInput({ value, onChange, onComplete, disabled }: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const code = useMemo(() => value.join(''), [value]);

  useEffect(() => {
    if (code.length === 6 && !value.includes('')) {
      onComplete?.(code);
    }
  }, [code, onComplete, value]);

  const setDigit = (index: number, char: string) => {
    const next = [...value];
    next[index] = char;
    onChange(next);
  };

  return (
    <div className="flex items-center justify-between gap-2">
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          disabled={disabled}
          value={digit}
          onChange={(e) => {
            const char = e.target.value.replace(/\D/g, '').slice(-1);
            setDigit(i, char);
            if (char && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !value[i] && i > 0) {
              refs.current[i - 1]?.focus();
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
            if (!digits.length) return;
            const next = Array.from({ length: 6 }, (_, idx) => digits[idx] ?? '');
            onChange(next);
            refs.current[Math.min(digits.length - 1, 5)]?.focus();
          }}
          className={`h-14 w-11 rounded-xl border text-center text-xl font-bold text-white outline-none transition ${digit ? 'border-brand-500 bg-brand-500/10' : 'border-glass-border bg-surface-800'} focus:border-brand-400 focus:ring-2 focus:ring-brand-500/50 disabled:opacity-60`}
        />
      ))}
    </div>
  );
}
