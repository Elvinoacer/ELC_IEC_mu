'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Card from '@/components/ui/Card';

interface ResultsPayload {
  positions: Array<{
    id: number;
    title: string;
    displayOrder: number;
    totalVotes: number;
    candidates: Array<{
      id: number;
      name: string;
      photoUrl: string;
      school: string;
      yearOfStudy: string;
      votes: number;
      percentage: number;
    }>;
  }>;
  turnout: { voted: number; total: number; percentage: number };
  isOpen: boolean;
  closesAt: string | null;
}

export default function ResultsPanel({ initialData, compact = false }: { initialData: ResultsPayload | null; compact?: boolean }) {
  const [data, setData] = useState<ResultsPayload | null>(initialData);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let socket: Socket | null = null;
    const timer = setTimeout(() => {
      socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001/results', {
        transports: ['websocket', 'polling'],
      });
      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));
      socket.on('vote_cast', (payload: ResultsPayload) => setData(payload));
    }, 300);

    return () => {
      clearTimeout(timer);
      socket?.disconnect();
    };
  }, []);

  const positions = useMemo(() => data?.positions ?? [], [data]);

  return (
    <Card padding="lg" className="h-full bg-surface-900/70 backdrop-blur border-white/10">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Live Results</h3>
        <span className={`text-xs ${connected ? 'text-success-400' : 'text-slate-400'}`}>{connected ? '🟢 Live' : '⚪ Offline'}</span>
      </div>

      {data && (
        <div className="mb-4 text-sm text-slate-300">
          Turnout <span className="font-semibold text-white">{data.turnout.percentage}%</span> ({data.turnout.voted}/{data.turnout.total})
        </div>
      )}

      <div className={`space-y-4 ${compact ? 'max-h-[320px] overflow-y-auto pr-1' : ''}`}>
        {positions.map((position) => {
          const candidates = compact ? position.candidates.slice(0, 2) : position.candidates;
          return (
            <div key={position.id} className="rounded-xl border border-white/5 bg-surface-800/70 p-3">
              <p className="mb-2 text-sm font-semibold text-white">{position.title}</p>
              <div className="space-y-2">
                {candidates.map((c) => (
                  <div key={c.id}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                      <span className="truncate pr-2">{c.name}</span>
                      <span>{c.votes} votes</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-700">
                      <div className="h-2 rounded-full bg-brand-500 transition-all duration-700" style={{ width: `${Math.max(c.percentage, 1)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
