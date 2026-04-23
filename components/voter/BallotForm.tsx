'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface Candidate {
  id: number;
  name: string;
  photoUrl: string;
  school: string;
  yearOfStudy: string;
}

interface PositionData {
  id: number;
  title: string;
  candidates: Candidate[];
}

interface Props {
  positions: PositionData[];
  deviceHash: string;
}

export default function BallotForm({ positions, deviceHash }: Props) {
  const router = useRouter();
  
  // State: selected candidate id per position title
  const [selections, setSelections] = useState<Record<string, number>>({});
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSelect = (positionTitle: string, candidateId: number) => {
    setSelections(prev => ({ ...prev, [positionTitle]: candidateId }));
  };

  const isComplete = positions.every(p => selections[p.title] !== undefined);

  const handleSubmit = async () => {
    if (!isComplete) return;
    setLoading(true);
    setError(null);

    try {
      const payload = {
        deviceHash,
        selections: Object.entries(selections).map(([position, candidateId]) => ({
          position,
          candidateId
        }))
      };

      const res = await fetch('/api/vote/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 409) { // Already voted or duplicate
           alert(data.error);
           router.push('/results');
           return;
        }
        throw new Error(data.error);
      }

      // Success! Redirect to results
      router.push('/results');

    } catch (err: any) {
      setError(err.message);
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      {error && (
        <div className="p-4 rounded-xl bg-error-500/10 border border-error-500/20 text-error-400 text-sm">
          {error}
        </div>
      )}

      {positions.map((pos) => (
        <div key={pos.id} className="fade-in">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-xl font-bold text-white font-[family-name:var(--font-outfit)]">{pos.title}</h2>
            {selections[pos.title] ? (
              <span className="text-xs font-medium px-2 py-1 bg-success-500/20 text-success-400 rounded-full border border-success-500/30">Selected</span>
            ) : (
              <span className="text-xs font-medium px-2 py-1 bg-error-500/20 text-error-400 rounded-full border border-error-500/30">Required</span>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pos.candidates.map(candidate => {
              const isSelected = selections[pos.title] === candidate.id;
              
              return (
                <div 
                  key={candidate.id}
                  onClick={() => handleSelect(pos.title, candidate.id)}
                  className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${
                    isSelected 
                      ? 'border-brand-500 bg-brand-500/10 shadow-[0_0_20px_rgba(37,99,235,0.2)]' 
                      : 'border-white/5 bg-surface-800 hover:border-white/20 hover:bg-surface-700'
                  }`}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`w-16 h-16 rounded-full overflow-hidden shrink-0 transition-transform ${isSelected ? 'scale-105 ring-2 ring-brand-500 ring-offset-2 ring-offset-surface-900' : ''}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={candidate.photoUrl} 
                        alt={candidate.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name='+encodeURIComponent(candidate.name)+'&background=2563eb&color=fff' }}
                      />
                    </div>
                    <div>
                      <h3 className={`font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}>{candidate.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">{candidate.school}</p>
                      <p className="text-xs text-slate-500">{candidate.yearOfStudy}</p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute top-2 right-2 text-brand-500">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="pt-8 border-t border-glass-border flex justify-end sticky bottom-4 bg-surface-900/80 backdrop-blur p-4 rounded-2xl shadow-xl z-20">
        <Button 
          size="lg" 
          disabled={!isComplete || loading}
          onClick={() => setShowConfirm(true)}
          className="w-full sm:w-auto min-w-[200px]"
        >
          {isComplete ? 'Review & Cast Vote' : 'Complete All Selections'}
        </Button>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in">
          <Card padding="xl" className="w-full max-w-md bg-surface-800 border-brand-500/30">
            <h2 className="text-2xl font-bold text-white mb-2 font-[family-name:var(--font-outfit)]">Confirm Your Vote</h2>
            <p className="text-sm text-slate-400 mb-6">
              You are about to cast your final ballot. This action <strong>cannot be undone</strong>.
            </p>

            <div className="max-h-[50vh] overflow-y-auto space-y-3 mb-6 pr-2">
              {positions.map(pos => {
                const selectedCandidateId = selections[pos.title];
                const candidate = pos.candidates.find(c => c.id === selectedCandidateId);
                return (
                  <div key={pos.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                    <span className="text-sm text-slate-400">{pos.title}</span>
                    <span className="text-sm font-bold text-white">{candidate?.name}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setShowConfirm(false)} disabled={loading} className="flex-1">
                Back to Ballot
              </Button>
              <Button variant="primary" onClick={handleSubmit} loading={loading} className="flex-1 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                Cast Final Vote
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
