"use client";

import React from "react";
import ELPLogo from "@/components/ELPLogo";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PublicShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/results",
      label: "Live",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      ),
    },
    {
      href: "/register-email",
      label: "Register",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 12H8m8 4H8m8-8H8m12-2a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2h8z"
        />
      ),
    },
    {
      href: "/",
      label: "Turnout",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      ),
    },
    {
      href: "/admin",
      label: "Account",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      ),
    },
  ];

  return (
    <div className="min-h-dvh bg-gradient-main flex flex-col overflow-x-hidden">
      {/* Decorative background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-600/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-800/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-accent-500/3 rounded-full blur-3xl" />
      </div>

      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 py-3 sm:px-8 sm:py-5">
        <div className="w-full max-w-7xl flex justify-between items-center px-4 h-14 sm:h-16 bg-surface-900/40 backdrop-blur-2xl border border-white/5 rounded-2xl sm:rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden group">
          {/* Subtle animated border glow */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-brand-500/50 to-transparent opacity-50" />

          <div className="flex items-center gap-4 sm:gap-10">
            <Link
              href="/"
              className="flex items-center transition-transform active:scale-95 duration-300"
            >
              <ELPLogo />
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              {[
                { href: "/results", label: "Results" },
                { href: "/register-email", label: "Voter Registration" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative py-1 font-bold text-sm tracking-wide transition-all hover:text-white ${
                    pathname === link.href ? "text-brand-400" : "text-slate-400"
                  }`}
                >
                  {link.label}
                  {pathname === link.href && (
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-brand-500 rounded-full shadow-[0_0_8px_rgba(163,42,41,0.6)]" />
                  )}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/results"
              className="group/btn relative p-2 text-slate-400 hover:text-white transition-all duration-300 rounded-xl bg-white/5 sm:bg-transparent hover:bg-white/10 active:scale-90"
              aria-label="View live results"
            >
              <div className="relative z-10">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {/* Live pulse indicator */}
                <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-accent-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              </div>
              <span className="absolute inset-0 rounded-xl bg-brand-500/0 group-hover/btn:bg-brand-500/10 transition-all duration-300" />
            </Link>

            <Link
              href="/admin"
              className="group/btn relative flex items-center justify-center p-2 text-slate-400 hover:text-white transition-all duration-300 rounded-xl bg-white/5 sm:bg-transparent hover:bg-white/10 active:scale-90"
              aria-label="Admin portal"
            >
              <div className="relative z-10">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                {/* Status indicator dot with pulse */}
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-brand-500 rounded-full border-2 border-surface-900 shadow-[0_0_8px_rgba(163,42,41,0.8)] animate-pulse" />
              </div>
              <span className="absolute inset-0 rounded-xl bg-white/0 group-hover/btn:bg-white/10 transition-all duration-300" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-page pt-24 sm:pt-32 pb-12 w-full">
        {children}
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="fixed bottom-0 left-0 right-0 grid grid-cols-4 gap-1 p-2 md:hidden bg-surface-900/80 backdrop-blur-xl border-t border-white/10 z-50 rounded-t-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center rounded-xl px-2 py-1.5 transition-all duration-300 ${
                isActive
                  ? "text-brand-500 bg-brand-500/10 shadow-[inset_0_0_12px_rgba(163,42,41,0.1)]"
                  : "text-slate-500 hover:text-brand-400 hover:bg-white/5"
              }`}
            >
              <svg
                className={`w-5 h-5 transition-transform duration-300 ${isActive ? "scale-110" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {item.icon}
              </svg>
              <span
                className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 transition-all ${isActive ? "opacity-100" : "opacity-70"}`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-surface-950 py-12 pb-32 md:pb-12 px-6 flex flex-col items-center gap-4 mt-auto transition-colors">
        <div className="text-sm font-bold text-slate-300">ELP Moi Chapter</div>
        <div className="flex flex-wrap justify-center gap-6">
          <Link
            className="text-xs text-slate-500 font-medium hover:text-brand-500 transition-colors"
            href="/admin"
          >
            Admin Access
          </Link>
          <Link
            className="text-xs text-slate-500 font-medium hover:text-brand-500 transition-colors"
            href="/results"
          >
            Live Results
          </Link>
          <Link
            className="text-xs text-slate-500 font-medium hover:text-brand-500 transition-colors"
            href="/register-email"
          >
            Voter Registration
          </Link>
        </div>
        <div className="text-xs text-slate-500 font-medium">
          © {new Date().getFullYear()} ELP Moi Chapter • Real-Time Election
          Authority
        </div>
      </footer>
    </div>
  );
}
