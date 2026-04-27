'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import BallotStepper from '@/components/voter/BallotStepper';
import CandidateCard from '@/components/voter/CandidateCard';
import ReviewScreen from '@/components/voter/ReviewScreen';
import Button from '@/components/ui/Button';
import { generateDeviceFingerprint } from '@/lib/fingerprint';

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

export default function BallotWizard({ positions, deviceHash }: { positions: PositionData[]; deviceHash: string }) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [selections, setSelections] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFingerprint, setActiveFingerprint] = useState(deviceHash);

  // Fallback: Regenerate fingerprint if missing or ensure it matches current device
  React.useEffect(() => {
    async function refreshFingerprint() {
      if (!activeFingerprint) {
        const fp = await generateDeviceFingerprint();
        setActiveFingerprint(fp);
      }
    }
    refreshFingerprint();
  }, [activeFingerprint]);

  const titles = useMemo(() => positions.map((p) => p.title), [positions]);
  const current = positions[currentStep];

  const onSubmit = async () => {
    if (!activeFingerprint) {
      setError('Device fingerprint not ready. Please refresh the page.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload = {
      deviceHash: activeFingerprint,
      selections: Object.entries(selections).map(([posId, candidateId]) => ({ 
        positionId: parseInt(posId, 10), 
        candidateId 
      })),
    };
    const res = await fetch('/api/vote/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      if (res.status === 409) {
        router.push('/results?voted=true');
        return;
      }
      setError(json.error || 'Failed to submit vote.');
      setSubmitting(false);
      return;
    }
    router.push('/vote/confirmed');
  };

  if (positions.length === 0) {
    return (
      <div className="p-8 sm:p-12 text-center bg-white/5 border border-white/10 rounded-[2.5rem] animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-16 h-16 bg-slate-500/10 rounded-2xl flex items-center justify-center mx-auto text-slate-500 mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">No ballot positions configured</h2>
        <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed">
          The election is currently active, but there are no approved candidates or positions to display at this time.
        </p>
        <Button 
          variant="outline" 
          onClick={() => router.push('/')} 
          className="mt-8 border-white/10 hover:bg-white/5"
        >
          Return Home
        </Button>
      </div>
    );
  }

  if (isReviewing) {
    return (
      <ReviewScreen
        positions={positions}
        selections={selections}
        confirmed={isConfirmed}
        onConfirmToggle={setIsConfirmed}
        onSubmit={onSubmit}
        onBack={() => setIsReviewing(false)}
        loading={submitting}
        error={error}
      />
    );
  }

  return (
    <div>
      <BallotStepper titles={titles} currentStep={currentStep} selections={selections} />
      <h2 className="mb-1 text-2xl font-bold text-white">{current.title}</h2>
      <p className="mb-4 text-sm text-slate-400">Select one candidate.</p>
      <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
        {current.candidates.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            selected={selections[current.id] === candidate.id}
            onSelect={() => setSelections((prev) => ({ ...prev, [current.id]: candidate.id }))}
          />
        ))}
      </div>

      <div className="ballot-action-bar mt-6 flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => setCurrentStep((s) => Math.max(0, s - 1))} disabled={currentStep === 0}>Back</Button>
        <Button
          onClick={() => {
            if (!selections[current.id]) return;
            if (currentStep === positions.length - 1) {
              setIsReviewing(true);
            } else {
              setCurrentStep((s) => s + 1);
            }
          }}
          disabled={!selections[current.id]}
          className="min-w-[190px]"
        >
          {currentStep === positions.length - 1 ? 'Review My Ballot' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
