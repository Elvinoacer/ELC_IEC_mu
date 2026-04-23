'use client';

import React, { useEffect, useState } from 'react';
import PublicShell from '@/components/layouts/PublicShell';
import AuthCard from '@/components/voter/AuthCard';
import ResultsPanel from '@/components/voter/ResultsPanel';
import type { ResultsPayload } from '@/lib/results';

export default function Home() {
  const [resultsData, setResultsData] = useState<ResultsPayload | null>(null);

  useEffect(() => {
    fetch('/api/results')
      .then((res) => res.json())
      .then((json) => setResultsData(json.data ?? null))
      .catch(() => setResultsData(null));
  }, []);

  return (
    <PublicShell>
      <div className="mx-auto mb-6 w-full max-w-6xl px-4 text-center md:px-6">
        <p className="text-xs uppercase tracking-[0.25em] text-accent-300/70">Equity Leaders Program · Moi Chapter</p>
        <h1 className="mt-3 text-3xl font-bold text-white md:text-5xl">Vote with Confidence</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300 md:text-base">Secure OTP verification, transparent live outcomes, and a premium election experience for every voter.</p>
      </div>

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-8 md:grid-cols-[420px_1fr] md:px-6">
        <div id="auth-card">
          <AuthCard onAlreadyVoted={() => document.getElementById('live-results')?.scrollIntoView({ behavior: 'smooth' })} />
        </div>

        <div id="live-results">
          <ResultsPanel initialData={resultsData} compact />
        </div>
      </div>
    </PublicShell>
  );
}
