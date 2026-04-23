'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PublicShell from '@/components/layouts/PublicShell';
import DetailedResults from '@/components/voter/DetailedResults';
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
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-slate-400 font-medium">Synchronizing Live Results...</p>
        </div>
      ) : (
        <DetailedResults 
          initialData={data} 
          hasAlreadyVoted={searchParams.get('voted') === 'true'} 
        />
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
