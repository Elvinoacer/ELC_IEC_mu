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
      className={`relative flex min-h-[72px] w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 bg-surface-800 hover:border-white/25'}`}
    >
      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${selected ? 'border-brand-400 bg-brand-500 text-white' : 'border-slate-500'}`}>{selected ? '✓' : ''}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={candidate.photoUrl} alt={candidate.name} className="h-14 w-14 rounded-full object-cover" />
      <div>
        <p className="font-semibold text-white">{candidate.name}</p>
        <p className="text-xs text-slate-400">{candidate.school}</p>
        <p className="text-xs text-slate-500">{candidate.yearOfStudy}</p>
      </div>
    </button>
  );
}
