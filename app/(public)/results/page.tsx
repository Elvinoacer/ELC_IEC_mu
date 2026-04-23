'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PublicShell from '@/components/layouts/PublicShell';
import ResultsPanel from '@/components/voter/ResultsPanel';
import type { ResultsPayload } from '@/lib/results';

function ResultsView() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<ResultsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/results')
      .then((res) => res.json())
      .then((json) => setData(json.data ?? null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 rounded-2xl border border-white/10 bg-gradient-to-r from-surface-800/80 to-surface-900/70 p-5 shadow-xl">
        <p className="text-xs uppercase tracking-[0.22em] text-accent-300/70">Live Election Analytics</p>
        <h1 className="mt-2 text-2xl font-bold text-white md:text-3xl">Real-Time Results Dashboard</h1>
      </div>

      {searchParams.get('voted') === 'true' && (
        <div className="mb-6 rounded-xl border border-brand-500/20 bg-brand-500/10 p-4 text-sm text-brand-200">
          You have already cast your vote. Thank you for participating.
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">Loading results...</p>
      ) : (
        <ResultsPanel initialData={data} compact={false} />
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <PublicShell>
      <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}>
        <ResultsView />
      </Suspense>
    </PublicShell>
  );
}
