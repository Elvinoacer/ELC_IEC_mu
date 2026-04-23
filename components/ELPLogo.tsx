import React from 'react';

export default function ELPLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Shield icon representing IEC */}
      <div className="relative w-10 h-10 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl rotate-3 opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600 to-brand-800 rounded-xl" />
        <svg
          className="relative w-5 h-5 text-white"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
          />
        </svg>
      </div>
      <div>
        <h1 className="text-lg font-bold text-white leading-tight tracking-tight">
          ELP <span className="text-brand-400">Moi Chapter</span>
        </h1>
        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-widest">
          Independent Electoral Commission
        </p>
      </div>
    </div>
  );
}
