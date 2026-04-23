'use client';

import { useEffect, useState } from 'react';
import VoterShell from '@/components/layouts/VoterShell';
import Button from '@/components/ui/Button';

export default function VoteConfirmedPage() {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    const redirectTimer = setTimeout(() => {
      window.location.href = '/results';
    }, 5000);
    return () => {
      clearInterval(interval);
      clearTimeout(redirectTimer);
    };
  }, []);

  return (
    <VoterShell step="done">
      <div className="text-center fade-in">
        <div className="mx-auto mb-6 flex h-20 w-20 animate-pulse items-center justify-center rounded-full border border-success-500/20 bg-success-500/15">
          <svg className="h-10 w-10 text-success-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-white">Your vote has been cast!</h1>
        <p className="mb-6 text-sm text-slate-300">Thank you for participating in ELP Moi Chapter Elections.</p>
        <p className="mb-4 text-sm text-slate-400">Redirecting in {countdown}…</p>
        <a href="/results">
          <Button variant="outline">Watch Live Results</Button>
        </a>
      </div>
    </VoterShell>
  );
}
