'use client';

import React, { useMemo } from 'react';
import Input from '@/components/ui/Input';

interface Props {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

function formatLocalPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

export default function PhoneInput({ value, onChange, error, disabled, autoFocus }: Props) {
  const formatted = useMemo(() => formatLocalPhone(value), [value]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">Phone Number</label>
      <div className="flex items-center gap-2 rounded-xl border border-glass-border bg-surface-800 p-2.5">
        <div className="inline-flex items-center gap-2 rounded-lg bg-surface-700 px-2 py-1 text-sm text-slate-200">
          <span aria-hidden>🇰🇪</span>
          <span>+254</span>
        </div>
        <Input
          value={formatted}
          onChange={(e) => onChange(e.target.value)}
          placeholder="712 345 678"
          className="border-0 bg-transparent px-0 py-0 focus:ring-0"
          inputMode="numeric"
          type="tel"
          disabled={disabled}
          autoFocus={autoFocus}
          error={error}
        />
      </div>
      <p className="text-xs text-slate-500">Your number is used only for secure OTP verification.</p>
    </div>
  );
}
