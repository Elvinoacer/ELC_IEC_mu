'use client';

import React, { useState, useEffect } from 'react';
import AdminShell from '@/components/layouts/AdminShell';
import Card from '@/components/ui/Card';
import { ResultsPayload } from '@/lib/results';
import { io, Socket } from 'socket.io-client';

export default function AdminResultsPage() {
  const [data, setData] = useState<ResultsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 1. Fetch initial snapshot
    fetch('/api/results')
      .then(res => res.json())
      .then(json => {
        if (json.data) setData(json.data);
      })
      .finally(() => setLoading(false));

    // 2. Connect to Socket.IO for live updates
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001/results';
    const socket: Socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('vote_cast', (payload: ResultsPayload) => setData(payload));

    return () => {
      socket.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <AdminShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-slate-500">Loading results...</div>
        </div>
      </AdminShell>
    );
  }

  if (!data) return null;

  return (
    <AdminShell title="Election Results">
      <div className="fade-in space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              {isConnected && (
                <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" title="Connected to live feed" />
              )}
              <p className="text-sm text-slate-400">Monitor live tallies and export audit data.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a 
              href="/api/admin/results/export-votes"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl text-sm font-medium bg-surface-800 border border-glass-border text-slate-300 hover:bg-glass-hover transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12L12 16.5m0 0L16.5 12M12 16.5V3" />
              </svg>
              Export All Votes (CSV)
            </a>
          </div>
        </div>

        {/* Positions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {data.positions.map((pos) => {
            const maxVotes = Math.max(...pos.candidates.map(c => c.votes));
            
            return (
              <Card key={pos.position} padding="lg" className="border-white/5 bg-surface-800/50">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold text-white">{pos.position}</h2>
                  <div className="px-2 py-1 rounded bg-surface-900 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                    {pos.total_votes_for_position} TOTAL
                  </div>
                </div>

                <div className="space-y-4">
                  {pos.candidates.map((candidate) => {
                    const isLeader = candidate.votes === maxVotes && candidate.votes > 0;
                    return (
                      <div key={candidate.id} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-3">
                            <span className={`font-medium ${isLeader ? 'text-white' : 'text-slate-400'}`}>
                              {candidate.name}
                            </span>
                            {isLeader && (
                              <span className="text-[10px] font-bold text-success-400 px-1.5 py-0.5 rounded bg-success-500/10 border border-success-500/20">
                                LEADING
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-white">{candidate.votes}</span>
                            <span className="text-slate-500 ml-2">({candidate.percentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-surface-900 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${isLeader ? 'bg-brand-500' : 'bg-slate-700'}`} 
                            style={{ width: `${candidate.percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </AdminShell>
  );
}
