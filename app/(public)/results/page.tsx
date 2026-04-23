'use client';

import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSearchParams } from 'next/navigation';
import PublicShell from '@/components/layouts/PublicShell';
import Card from '@/components/ui/Card';
import { ResultsPayload } from '@/lib/results';

import { Suspense } from 'react';

function ResultsView() {
  const searchParams = useSearchParams();
  const showVotedMessage = searchParams.get('voted') === 'true';
  
  const [data, setData] = useState<ResultsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 1. Fetch initial snapshot
    fetch('/api/results')
      .then(res => res.json())
      .then(json => {
        if (json.error) throw new Error(json.error);
        setData(json.data || json); // handle unwrapped or wrapped success
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));

    // 2. Connect to Socket.IO
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001/results';
    const socket: Socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to live results stream');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from live results stream');
    });

    socket.on('vote_cast', (payload: ResultsPayload) => {
      setData(payload);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-pulse text-slate-400 font-medium">Loading live results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] px-4">
        <Card padding="lg" className="border-error-500/30">
          <h2 className="text-xl font-bold text-error-400 mb-2">Error loading results</h2>
          <p className="text-slate-300">{error}</p>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      
      {/* Header & Global Stats */}
      <div className="mb-12">
        {showVotedMessage && (
          <div className="mb-8 p-4 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-300 text-sm flex items-start gap-3 slide-up">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <div>
              <p className="font-bold mb-1">You have already cast your vote!</p>
              <p className="opacity-80">Thank you for participating. You can monitor the live results here as they come in.</p>
            </div>
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 font-[family-name:var(--font-outfit)] flex items-center gap-3">
              Live Results
              {isConnected && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-success-500"></span>
                </span>
              )}
            </h1>
            <p className="text-slate-400">
              {isConnected ? 'Updating in real-time as votes are cast.' : 'Connection lost. Reconnecting...'}
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-3xl font-bold text-brand-400 font-[family-name:var(--font-outfit)]">
              {data.global.turnout_percentage}%
            </div>
            <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">Voter Turnout</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card padding="sm" className="text-center bg-surface-900 border-white/5">
            <div className="text-2xl font-bold text-white">{data.global.total_eligible}</div>
            <div className="text-xs text-slate-500 mt-1">Total Eligible</div>
          </Card>
          <Card padding="sm" className="text-center bg-surface-900 border-white/5">
            <div className="text-2xl font-bold text-brand-400">{data.global.total_cast}</div>
            <div className="text-xs text-slate-500 mt-1">Votes Cast</div>
          </Card>
          <Card padding="sm" className="text-center bg-surface-900 border-white/5">
            <div className="text-2xl font-bold text-slate-300">{data.global.remaining}</div>
            <div className="text-xs text-slate-500 mt-1">Remaining</div>
          </Card>
          <Card padding="sm" className="text-center bg-surface-900 border-white/5">
            <div className="text-2xl font-bold text-success-400">{data.positions.length}</div>
            <div className="text-xs text-slate-500 mt-1">Active Positions</div>
          </Card>
        </div>
      </div>

      {/* Positions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {data.positions.map((pos) => {
          const maxVotes = Math.max(...pos.candidates.map(c => c.votes));
          
          return (
            <Card key={pos.position} padding="lg" className="border-white/10 shadow-2xl backdrop-blur-sm bg-surface-900/80">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                <h2 className="text-xl font-bold text-white font-[family-name:var(--font-outfit)]">{pos.position}</h2>
                <div className="text-sm font-medium text-slate-400">{pos.total_votes_for_position} votes cast</div>
              </div>

              {pos.candidates.length === 0 ? (
                <p className="text-slate-500 text-sm italic">No approved candidates.</p>
              ) : (
                <div className="space-y-6">
                  {pos.candidates.map((candidate) => {
                    const isLeader = candidate.votes === maxVotes && candidate.votes > 0;
                    
                    return (
                      <div key={candidate.id} className="relative">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full overflow-hidden shrink-0 ${isLeader ? 'ring-2 ring-brand-400 ring-offset-2 ring-offset-surface-800' : ''}`}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={candidate.photoUrl} 
                                alt={candidate.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name='+encodeURIComponent(candidate.name)+'&background=2563eb&color=fff' }}
                              />
                            </div>
                            <div>
                              <h3 className={`font-bold ${isLeader ? 'text-white' : 'text-slate-300'}`}>{candidate.name}</h3>
                              <p className="text-xs text-slate-500">{candidate.school}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${isLeader ? 'text-brand-400' : 'text-white'}`}>
                              {candidate.percentage.toFixed(1)}%
                            </div>
                            <div className="text-xs text-slate-500">
                              {candidate.votes} votes
                            </div>
                          </div>
                        </div>
                        
                        <div className="h-2 w-full bg-surface-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${isLeader ? 'bg-gradient-to-r from-brand-500 to-blue-400' : 'bg-slate-600'}`}
                            style={{ width: `${Math.max(candidate.percentage, 1)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <PublicShell>
      <Suspense fallback={
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-pulse text-slate-400 font-medium">Loading live results...</div>
        </div>
      }>
        <ResultsView />
      </Suspense>
    </PublicShell>
  );
}
