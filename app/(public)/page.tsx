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
