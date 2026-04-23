'use client';

import React from 'react';

export default function BallotStepper({ titles, currentStep, selections }: { titles: string[]; currentStep: number; selections: Record<string, number> }) {
  return (
    <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2">
      {titles.map((title, index) => {
        const completed = !!selections[title];
        const current = index === currentStep;
        return (
          <div key={title} className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-full border text-xs flex items-center justify-center ${completed ? 'bg-brand-500 border-brand-500 text-white' : current ? 'border-brand-400 text-brand-300 animate-pulse' : 'border-slate-600 text-slate-500'}`}>
              {completed ? '✓' : index + 1}
            </div>
            <span className="max-w-[90px] truncate text-xs text-slate-400">{title}</span>
            {index < titles.length - 1 && <span className="text-slate-600">—</span>}
          </div>
        );
      })}
    </div>
  );
}
