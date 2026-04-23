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
