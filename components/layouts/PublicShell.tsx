import React from 'react';
import ELPLogo from '@/components/ELPLogo';

export default function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gradient-main flex flex-col">
      {/* Decorative background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-600/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-800/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-500/3 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-glass-border">
        <div className="max-w-5xl mx-auto px-[var(--spacing-page)] py-4 flex items-center justify-between">
          <ELPLogo />
          <nav className="hidden sm:flex items-center gap-6">
            <a href="/results" className="text-sm text-slate-400 hover:text-white transition-colors">
              Results
            </a>
            <a href="/register-candidate" className="text-sm text-slate-400 hover:text-white transition-colors">
              Run for Office
            </a>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-[var(--spacing-page)] py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-glass-border">
        <div className="max-w-5xl mx-auto px-[var(--spacing-page)] py-4 flex items-center justify-between">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} ELP Moi Chapter IEC
          </p>
          <p className="text-xs text-slate-600">
            Secure Electronic Voting System
          </p>
        </div>
      </footer>
    </div>
  );
}
