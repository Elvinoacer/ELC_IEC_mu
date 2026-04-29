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
      className={`group relative flex flex-col sm:flex-row items-center gap-6 rounded-[2rem] border p-5 text-left transition-all duration-500 overflow-hidden ${
        selected 
          ? 'border-brand-500 bg-brand-500/10 shadow-[0_20px_50px_-12px_rgba(163,42,41,0.25)] scale-[1.02]' 
          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.08]'
      }`}
    >
      {/* Background Glow Effect */}
      <div className={`absolute -right-10 -bottom-10 w-40 h-40 rounded-full blur-[60px] transition-opacity duration-500 ${selected ? 'bg-brand-500/20 opacity-100' : 'bg-brand-500/10 opacity-0'}`} />
      
      {/* Selection Indicator */}
      <div className={`absolute top-5 right-5 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
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
        <div className={`w-32 h-32 sm:w-36 sm:h-36 rounded-[1.75rem] overflow-hidden border-2 transition-all duration-500 group-hover:scale-[1.03] ${
          selected ? 'border-brand-500 shadow-2xl shadow-brand-500/20' : 'border-white/10'
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
      <div className="relative z-10 flex-grow text-center sm:text-left space-y-2">
        <div>
          <h3 className={`text-xl sm:text-2xl font-black transition-colors duration-300 ${selected ? 'text-brand-400' : 'text-white'}`}>
            {candidate.name}
          </h3>
          <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-[0.1em] mt-0.5">
            Running for Position
          </p>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-300">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-500/50" />
            <span className="text-xs sm:text-sm font-medium">{candidate.school}</span>
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-500">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">{candidate.yearOfStudy}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
