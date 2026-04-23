'use client';

import React from 'react';
import ELPLogo from '@/components/ELPLogo';

interface VoterShellProps {
  children: React.ReactNode;
  step?: 'phone' | 'otp' | 'vote' | 'done';
}

const steps = [
  { key: 'phone', label: 'Phone' },
  { key: 'otp', label: 'Verify' },
  { key: 'vote', label: 'Vote' },
  { key: 'done', label: 'Done' },
] as const;

export default function VoterShell({ children, step = 'phone' }: VoterShellProps) {
  const currentIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-dvh bg-gradient-main flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-600/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-800/8 rounded-full blur-3xl" />
      </div>

      {/* Header with progress */}
      <header className="relative z-10 border-b border-glass-border">
        <div className="max-w-3xl mx-auto px-[var(--spacing-page)] py-3 sm:py-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <ELPLogo />
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1">
            {steps.map((s, i) => (
              <React.Fragment key={s.key}>
                <div className="flex items-center gap-2">
                  <div
                    className={`
                      w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                      transition-all duration-300
                      ${i < currentIndex
                        ? 'bg-success-500 text-white'
                        : i === currentIndex
                        ? 'bg-brand-600 text-white ring-2 ring-brand-400/30'
                        : 'bg-surface-700 text-slate-500'
                      }
                    `}
                  >
                    {i < currentIndex ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                    <span
                    className={`text-[10px] sm:text-xs font-medium hidden sm:block ${
                      i <= currentIndex ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 rounded-full transition-all duration-300 ${
                      i < currentIndex ? 'bg-success-500' : 'bg-surface-700'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center py-6 sm:py-12 px-[var(--spacing-page)]">
        <div className="w-full max-w-5xl">
          {children}
        </div>
      </main>
    </div>
  );
}
