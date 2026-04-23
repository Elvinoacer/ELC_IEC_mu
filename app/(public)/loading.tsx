import React from 'react';

export default function PublicLoading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-surface-900/50 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-b-accent-500 rounded-full animate-spin [animation-duration:1.5s]"></div>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-500 animate-pulse">Loading</span>
          <div className="h-0.5 w-8 bg-gradient-to-r from-brand-600 to-accent-600 rounded-full mt-1"></div>
        </div>
      </div>
    </div>
  );
}
