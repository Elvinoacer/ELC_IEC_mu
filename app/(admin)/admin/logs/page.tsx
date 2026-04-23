'use client';

import React, { useState, useEffect } from 'react';
import AdminShell from '@/components/layouts/AdminShell';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface AuditLog {
  id: number;
  action: string;
  entity: string;
  entityId: string;
  details: any;
  ipAddress: string;
  createdAt: string;
  admin?: {
    username: string;
  };
}

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/logs?page=${p}`);
      const json = await res.json();
      if (json.data) {
        setLogs(json.data);
        setTotalPages(json.meta.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  return (
    <AdminShell title="Audit Logs">
      <div className="space-y-6">
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-surface-800 text-slate-400 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-bold">Time</th>
                  <th className="px-6 py-4 font-bold">Admin</th>
                  <th className="px-6 py-4 font-bold">Action</th>
                  <th className="px-6 py-4 font-bold">Entity</th>
                  <th className="px-6 py-4 font-bold">IP Address</th>
                  <th className="px-6 py-4 font-bold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-6 py-8 h-12 bg-surface-900/50"></td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">No logs found.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-white">
                        {log.admin?.username || 'System'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                          log.action.includes('APPROVE') ? 'bg-success-500/10 text-success-400' :
                          log.action.includes('REJECT') ? 'bg-error-500/10 text-error-400' :
                          log.action.includes('RESET') ? 'bg-warning-500/10 text-warning-400' :
                          'bg-brand-500/10 text-brand-400'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {log.entity} <span className="text-slate-500">#{log.entityId}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-[10px]">
                        {log.ipAddress || 'Unknown'}
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => alert(JSON.stringify(log.details, null, 2))}
                          className="text-brand-400 hover:underline"
                        >
                          View JSON
                        </button>
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
