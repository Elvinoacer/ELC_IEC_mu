'use client';

import React, { useState, useEffect } from 'react';
import AdminShell from '@/components/layouts/AdminShell';
import Card from '@/components/ui/Card';
import Link from 'next/link';

interface DashboardData {
  voters: {
    total: number;
    withEmail: number;
    registered: number;
    voted: number;
    remaining: number;
    turnout: number;
  };
  candidates: {
    pending: number;
    approved: number;
  };
  positions: number;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/summary')
      .then(res => res.json())
      .then(json => {
        if (json.data) setData(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminShell title="Election Dashboard">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-slate-500">Loading metrics...</div>
        </div>
      </AdminShell>
    );
  }

  if (!data) return null;

  return (
    <AdminShell title="Election Dashboard">
      <div className="fade-in space-y-8">
        <div>
          <p className="text-sm text-slate-400">Live overview of the ELP Moi Chapter voting process.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="md" className="bg-surface-800 border-white/5">
            <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">In System</div>
            <div className="text-3xl font-bold text-white font-[family-name:var(--font-outfit)]">{data.voters.total}</div>
            <div className="mt-2 text-xs text-slate-500">All imported phone numbers</div>
          </Card>

          <Card padding="md" className="bg-surface-800 border-white/5">
            <div className="text-brand-400 text-xs font-medium uppercase tracking-wider mb-2">Registered</div>
            <div className="text-3xl font-bold text-white font-[family-name:var(--font-outfit)]">{data.voters.registered}</div>
            <div className="mt-2 text-xs text-slate-500">{data.voters.withEmail} have provided email</div>
          </Card>

          <Card padding="md" className="bg-surface-800 border-white/5">
            <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Votes Cast</div>
            <div className="text-3xl font-bold text-white font-[family-name:var(--font-outfit)]">{data.voters.voted}</div>
            <div className="mt-2 text-xs text-slate-500">{data.voters.remaining} registered remaining</div>
          </Card>

          <Card padding="md" className="bg-brand-600/10 border-brand-500/20">
            <div className="text-brand-400 text-xs font-medium uppercase tracking-wider mb-2">Turnout</div>
            <div className="text-3xl font-bold text-brand-400 font-[family-name:var(--font-outfit)]">{data.voters.turnout}%</div>
            <div className="mt-2 h-1.5 w-full bg-surface-900 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full" style={{ width: `${data.voters.turnout}%` }} />
            </div>
            <div className="mt-1 text-[10px] text-slate-500 text-center">of registered voters</div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Candidates Status */}
          <Card padding="lg" className="lg:col-span-1 border-white/5">
            <h3 className="text-lg font-bold text-white mb-6 font-[family-name:var(--font-outfit)]">Candidate Status</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-warning-500/10 border border-warning-500/20 flex items-center justify-center text-warning-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Pending Review</div>
                    <div className="text-xs text-slate-500">Awaiting IEC action</div>
                  </div>
                </div>
                <div className="text-xl font-bold text-warning-400">{data.candidates.pending}</div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success-500/10 border border-success-500/20 flex items-center justify-center text-success-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Approved</div>
                    <div className="text-xs text-slate-500">On the official ballot</div>
                  </div>
                </div>
                <div className="text-xl font-bold text-success-400">{data.candidates.approved}</div>
              </div>

              <div className="pt-4">
                <Link 
                  href="/admin/candidates" 
                  className="block w-full py-2.5 text-center text-sm font-medium text-slate-300 bg-surface-900 border border-glass-border rounded-xl hover:bg-glass-hover transition-colors"
                >
                  Manage Candidates
                </Link>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card padding="lg" className="lg:col-span-2 border-white/5">
            <h3 className="text-lg font-bold text-white mb-6 font-[family-name:var(--font-outfit)]">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/admin/voters" className="group p-4 rounded-2xl bg-surface-900 border border-glass-border hover:border-brand-500/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 018.625 21c-2.331 0-4.512-.645-6.374-1.766z" />
                  </svg>
                </div>
                <div className="font-bold text-white mb-1">Add Voters</div>
                <div className="text-xs text-slate-500">Import or add eligible voters.</div>
              </Link>

              <Link href="/admin/config" className="group p-4 rounded-2xl bg-surface-900 border border-glass-border hover:border-brand-500/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="font-bold text-white mb-1">Voting Window</div>
                <div className="text-xs text-slate-500">Set open/close times for voting.</div>
              </Link>

              <Link href="/admin/results" className="group p-4 rounded-2xl bg-surface-900 border border-glass-border hover:border-brand-500/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-success-500/10 flex items-center justify-center text-success-400 mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                </div>
                <div className="font-bold text-white mb-1">Detailed Results</div>
                <div className="text-xs text-slate-500">View real-time counts and exports.</div>
              </Link>

              <div className="p-4 rounded-2xl bg-surface-900 border border-glass-border">
                <div className="w-10 h-10 rounded-xl bg-error-500/10 flex items-center justify-center text-error-400 mb-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.34c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div className="font-bold text-white mb-1">Emergency Stop</div>
                <div className="text-xs text-slate-500">Immediately close the voting window.</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
