'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import BallotStepper from '@/components/voter/BallotStepper';
import CandidateCard from '@/components/voter/CandidateCard';
import ReviewScreen from '@/components/voter/ReviewScreen';
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

export default function BallotWizard({ positions, deviceHash }: { positions: PositionData[]; deviceHash: string }) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titles = useMemo(() => positions.map((p) => p.title), [positions]);
  const current = positions[currentStep];

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const payload = {
      deviceHash,
      selections: Object.entries(selections).map(([position, candidateId]) => ({ position, candidateId })),
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
            selected={selections[current.title] === candidate.id}
            onSelect={() => setSelections((prev) => ({ ...prev, [current.title]: candidate.id }))}
          />
        ))}
      </div>

      <div className="ballot-action-bar mt-6 flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => setCurrentStep((s) => Math.max(0, s - 1))} disabled={currentStep === 0}>Back</Button>
        <Button
          onClick={() => {
            if (!selections[current.title]) return;
            if (currentStep === positions.length - 1) {
              setIsReviewing(true);
            } else {
              setCurrentStep((s) => s + 1);
            }
          }}
          disabled={!selections[current.title]}
          className="min-w-[190px]"
        >
          {currentStep === positions.length - 1 ? 'Review My Ballot' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
