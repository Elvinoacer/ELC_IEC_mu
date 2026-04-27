'use client';

import React, { useState, useEffect } from 'react';
import AdminShell from '@/components/layouts/AdminShell';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface VoteAttempt {
  id: number;
  voterId: number | null;
  phone: string | null;
  status: string;
  reason: string | null;
  ipAddress: string | null;
  deviceHash: string | null;
  createdAt: string;
}

export default function VoteAttemptsPage() {
  const [attempts, setAttempts] = useState<VoteAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchAttempts = async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/vote-attempts?page=${p}`);
      const json = await res.json();
      if (json.data) {
        setAttempts(json.data);
        setTotalPages(json.meta.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch attempts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchAttempts(page);
    };
    init();
  }, [page]);

  return (
    <AdminShell title="Vote Attempts Monitoring">
      <div className="space-y-6">
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-surface-800 text-slate-400 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-bold">Time</th>
                  <th className="px-6 py-4 font-bold">Voter / Phone</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Device Hash</th>
                  <th className="px-6 py-4 font-bold">IP Address</th>
                  <th className="px-6 py-4 font-bold">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-6 py-8 h-12 bg-surface-900/50"></td>
                    </tr>
                  ))
                ) : attempts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">No attempts recorded.</td>
                  </tr>
                ) : (
                  attempts.map((att) => (
                    <tr key={att.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(att.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{att.phone || 'Unknown'}</div>
                        <div className="text-[10px] text-slate-500">{att.voterId ? `ID: ${att.voterId}` : 'Guest'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                          att.status === 'SUCCESS' ? 'bg-success-500/10 text-success-400' :
                          att.status === 'DUPLICATE' ? 'bg-warning-500/10 text-warning-400' :
                          'bg-error-500/10 text-error-400'
                        }`}>
                          {att.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-[10px]">
                        {att.deviceHash ? `${att.deviceHash.substring(0, 12)}...` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-[10px]">
                        {att.ipAddress || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-slate-400 italic">
                        {att.reason || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="px-6 py-4 bg-surface-800/50 border-t border-white/5 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="ghost" 
                disabled={page === 1 || loading}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                disabled={page === totalPages || loading}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
