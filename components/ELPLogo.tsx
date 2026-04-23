import React from 'react';

export default function ELPLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 group ${className}`}>
      <div className="relative w-12 h-12 flex items-center justify-center">
        {/* Dynamic SVG Logo (No external file dependency) */}
        <svg 
          viewBox="0 0 120 120" 
          className="w-10 h-10 filter drop-shadow-[0_0_8px_rgba(163,35,35,0.3)] transition-transform duration-500 group-hover:scale-110" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Equity-style House/Roof Shape */}
          <path 
            d="M10 80H35V45H48L85 10L125 50H105V80H10Z" 
            fill="#A32323" 
          />
          {/* Voting Checkmark inside the house */}
          <path 
            d="M45 65L60 80L95 45" 
            stroke="white" 
            strokeWidth="10" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="hidden sm:block">
        <h1 className="text-lg font-bold text-white leading-tight tracking-tight font-[family-name:var(--font-outfit)]">
          ELP <span className="text-brand-400">Moi Chapter</span>
        </h1>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
          Electoral Commission
        </p>
      </div>
    </div>
  );
}
