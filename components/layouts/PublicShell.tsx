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

      {/* Fixed Header */}
      <header className="fixed top-0 left-0 w-full flex justify-between items-center px-6 h-16 bg-surface-900/70 backdrop-blur-md border-b border-white/10 z-50 shadow-2xl">
        <div className="flex items-center gap-8">
          <a href="/" className="flex items-center">
            <ELPLogo />
          </a>
          <nav className="hidden md:flex items-center gap-6">
            <a href="/results" className="text-brand-400 border-b-2 border-brand-500 pb-1 font-semibold text-sm">Results</a>
            <a href="/register-candidate" className="text-slate-400 hover:text-white transition-colors font-semibold text-sm">Run for Office</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-400 hover:bg-white/5 transition-all duration-300 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          </button>
          <button className="p-2 text-slate-400 hover:bg-white/5 transition-all duration-300 rounded-full">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-[var(--spacing-page)] pt-24 pb-12">
        {children}
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="fixed bottom-0 w-full flex justify-around items-center p-3 md:hidden bg-surface-900/80 backdrop-blur-xl border-t border-white/10 z-50 rounded-t-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <button className="flex flex-col items-center justify-center text-brand-500 bg-brand-500/10 rounded-xl px-4 py-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Live</span>
        </button>
        <button className="flex flex-col items-center justify-center text-slate-500 hover:text-brand-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Candidates</span>
        </button>
        <button className="flex flex-col items-center justify-center text-slate-500 hover:text-brand-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Turnout</span>
        </button>
        <button className="flex flex-col items-center justify-center text-slate-500 hover:text-brand-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Account</span>
        </button>
      </nav>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-surface-950 py-12 pb-32 md:pb-12 px-6 flex flex-col items-center gap-4 mt-auto transition-colors">
        <div className="text-sm font-bold text-slate-300">ELP Moi Chapter</div>
        <div className="flex flex-wrap justify-center gap-6">
          <a className="text-xs text-slate-500 font-medium hover:text-brand-500 transition-colors" href="#">Privacy Policy</a>
          <a className="text-xs text-slate-500 font-medium hover:text-brand-500 transition-colors" href="#">Terms of Service</a>
          <a className="text-xs text-slate-500 font-medium hover:text-brand-500 transition-colors" href="#">Contact Support</a>
        </div>
        <div className="text-xs text-slate-500 font-medium">© {new Date().getFullYear()} ELP Moi Chapter • Real-Time Election Authority</div>
      </footer>
    </div>
  );
}
