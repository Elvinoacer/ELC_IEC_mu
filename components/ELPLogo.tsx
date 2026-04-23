import React from 'react';
import Image from 'next/image';

export default function ELPLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative w-12 h-12 flex items-center justify-center">
        <Image 
          src="/logo.png" 
          alt="ELP Moi Chapter Logo" 
          width={48} 
          height={48} 
          className="object-contain"
        />
      </div>
      <div className="hidden sm:block">
        <h1 className="text-lg font-bold text-white leading-tight tracking-tight">
          ELP <span className="text-brand-400">Moi Chapter</span>
        </h1>
        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-widest">
          Electoral Commission
        </p>
      </div>
    </div>
  );
}
