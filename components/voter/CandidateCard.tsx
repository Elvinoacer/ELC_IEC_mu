'use client';

import React from 'react';

interface Candidate {
  id: number;
  name: string;
  photoUrl: string;
  school: string;
  yearOfStudy: string;
}

export default function CandidateCard({ candidate, selected, onSelect }: { candidate: Candidate; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex flex-col items-center text-center gap-5 rounded-[2.5rem] border p-6 transition-all duration-500 overflow-hidden ${
        selected 
          ? 'border-brand-500 bg-brand-500/10 shadow-[0_20px_50px_-12px_rgba(163,42,41,0.25)] scale-[1.02]' 
          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.08]'
      }`}
    >
      {/* Background Glow Effect */}
      <div className={`absolute -right-10 -bottom-10 w-40 h-40 rounded-full blur-[60px] transition-opacity duration-500 ${selected ? 'bg-brand-500/20 opacity-100' : 'bg-brand-500/10 opacity-0'}`} />
      
      {/* Selection Indicator */}
      <div className={`absolute top-5 right-5 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 z-10 ${
        selected ? 'bg-brand-500 border-brand-500 scale-110' : 'bg-transparent border-white/20'
      }`}>
        {selected && (
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Candidate Photo */}
      <div className="relative shrink-0">
        <div className={`absolute inset-0 bg-brand-500/20 blur-2xl rounded-full transition-opacity duration-500 ${selected ? 'opacity-40' : 'opacity-0'}`} />
        <div className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden border-4 transition-all duration-500 group-hover:scale-[1.03] ${
          selected ? 'border-brand-500/80 shadow-2xl shadow-brand-500/30' : 'border-white/10'
        }`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={candidate?.photoUrl || '/placeholder-avatar.png'} 
            alt={candidate?.name || 'Candidate'} 
            className="h-full w-full object-cover" 
          />
        </div>
      </div>

      {/* Candidate Info */}
      <div className="relative z-10 w-full flex flex-col items-center space-y-3 pt-2">
        <div className="w-full">
          <h3 className={`text-2xl sm:text-3xl font-black transition-colors duration-300 leading-tight line-clamp-2 px-2 ${selected ? 'text-brand-400' : 'text-white'}`}>
            {candidate.name}
          </h3>
        </div>
        
        <div className="flex flex-col items-center gap-1.5 w-full">
          <div className="flex items-center justify-center gap-2 text-slate-300">
            <svg className="w-4 h-4 text-brand-500/80 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            <span className="text-sm sm:text-base font-medium truncate">{candidate.school}</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-widest truncate">{candidate.yearOfStudy}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
