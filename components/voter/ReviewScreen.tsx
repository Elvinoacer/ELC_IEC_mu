'use client';

import React from 'react';
import Button from '@/components/ui/Button';

interface PositionData {
  id: number;
  title: string;
  candidates: Array<{ id: number; name: string }>;
}

export default function ReviewScreen({ positions, selections, confirmed, onConfirmToggle, onSubmit, onBack, loading, error }: {
  positions: PositionData[];
  selections: Record<string, number>;
  confirmed: boolean;
  onConfirmToggle: (v: boolean) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
  error?: string | null;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">⚠ This cannot be changed. Review carefully.</div>
      {positions.map((pos) => {
        const selected = pos.candidates.find((c) => c.id === selections[pos.title]);
        return (
          <div key={pos.id} className="flex items-center justify-between border-b border-white/5 py-2">
            <p className="text-sm text-slate-300">{pos.title}</p>
            <p className="text-sm font-semibold text-white">{selected?.name ?? 'Not selected'}</p>
          </div>
        );
      })}

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" checked={confirmed} onChange={(e) => onConfirmToggle(e.target.checked)} />
        I confirm these are my final choices
      </label>
      {error && <p className="text-sm text-error-400">{error}</p>}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={loading}>Back</Button>
        <Button onClick={onSubmit} disabled={!confirmed || loading} loading={loading} className="flex-1 min-h-12">Cast Vote</Button>
      </div>
    </div>
  );
}
