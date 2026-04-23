import React from 'react';

export default function ELPLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3.5 group ${className}`}>
      {/* Premium Icon Container */}
      <div className="relative w-11 h-11 flex items-center justify-center bg-surface-800/50 rounded-xl border border-white/10 shadow-lg group-hover:border-brand-500/30 transition-all duration-500">
        <svg 
          viewBox="0 0 24 24" 
          className="w-7 h-7 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Professional House Shape */}
          <path 
            d="M3 10L12 3L21 10V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V10Z" 
            fill="#A32323" 
          />
          {/* Clear Checkmark */}
          <path 
            d="M8 13L11 16L16 9" 
            stroke="white" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
        
        {/* Subtle decorative glow */}
        <div className="absolute inset-0 bg-brand-500/5 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      </div>

      <div className="hidden sm:block">
        <h1 className="text-lg font-bold text-white leading-tight tracking-tight font-[family-name:var(--font-outfit)]">
          ELP <span className="text-brand-400">Moi Chapter</span>
        </h1>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.25em]">
          Electoral Commission
        </p>
      </div>
    </div>
  );
}
