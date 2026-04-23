'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminShell from '@/components/layouts/AdminShell';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import VoterImportModal from '@/components/admin/VoterImportModal';
import AddVoterModal from '@/components/admin/AddVoterModal';

interface Voter {
  id: number;
  phone: string;
  name: string | null;
  hasVoted: boolean;
  createdAt: string;
}

export default function AdminVotersPage() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVoters, setTotalVoters] = useState(0);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const fetchVoters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/voters?page=${page}&limit=10&search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (res.ok) {
        setVoters(json.data);
        setTotalPages(json.meta.totalPages);
        setTotalVoters(json.meta.total);
      }
    } catch (err) {
      console.error('Failed to fetch voters:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchVoters();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [fetchVoters]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this voter?')) return;
    
    try {
      const res = await fetch(`/api/admin/voters/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchVoters();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
      }
    } catch (err) {
      alert('Error deleting voter');
    }
  };

  const handleEditName = async (id: number, currentName: string | null) => {
    const newName = window.prompt('Enter new name for voter:', currentName || '');
    if (newName === null) return;

    try {
      const res = await fetch(`/api/admin/voters/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', name: newName }),
      });
      if (res.ok) {
        fetchVoters();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update name');
      }
    } catch (err) {
      alert('Error updating voter');
    }
  };

  const handleReset = async (id: number) => {
    if (!window.confirm('WARNING: This will clear the voter\'s device hash, unmark them as voted, and DELETE any votes they cast. Are you absolutely sure?')) return;
    
    try {
      const res = await fetch(`/api/admin/voters/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      if (res.ok) {
        fetchVoters();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to reset voter');
      }
    } catch (err) {
      alert('Error resetting voter');
    }
  };

  return (
    <AdminShell title="Voter Registry">
      <div className="fade-in space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">
              Manage the voter registry. Total: <span className="text-white font-medium">{totalVoters}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <a 
              href="/api/admin/voters/export"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 border border-white/10 hover:bg-white/5 transition-all"
            >
              Export CSV
            </a>
            <button 
              onClick={() => setIsImportOpen(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-brand-400 border border-brand-500/20 hover:bg-brand-600/15 transition-all"
            >
              Import CSV
            </button>
            <button 
              onClick={() => setIsAddOpen(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-brand-600 text-white hover:bg-brand-500 transition-all shadow-lg"
            >
              Add Voter
            </button>
          </div>
        </div>

        <Card padding="md">
          {/* Controls */}
          <div className="mb-6 flex items-center justify-between">
            <div className="relative w-full max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search phone or name..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2 bg-surface-900 border border-glass-border rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-glass-border text-slate-400">
                  <th className="pb-3 font-medium px-4">Phone Number</th>
                  <th className="pb-3 font-medium px-4">Name</th>
                  <th className="pb-3 font-medium px-4">Status</th>
                  <th className="pb-3 font-medium px-4">Added On</th>
                  <th className="pb-3 font-medium px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border">
                {loading && voters.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">Loading voters...</td>
                  </tr>
                ) : voters.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">No voters found.</td>
                  </tr>
                ) : (
                  voters.map((voter) => (
                    <tr key={voter.id} className="hover:bg-glass-hover transition-colors">
                      <td className="py-3 px-4 text-white font-medium">{voter.phone}</td>
                      <td className="py-3 px-4 text-slate-300">{voter.name || <span className="text-slate-600 italic">No name</span>}</td>
                      <td className="py-3 px-4">
                        <Badge variant={voter.hasVoted ? 'success' : 'default'}>
                          {voter.hasVoted ? 'Voted' : 'Pending'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{new Date(voter.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleEditName(voter.id, voter.name)}
                          className="text-xs font-medium px-2 py-1 rounded transition-colors text-brand-400 hover:bg-brand-500/10"
                        >
                          Edit
                        </button>
                        {voter.hasVoted && (
                          <button
                            onClick={() => handleReset(voter.id)}
                            className="text-xs font-medium px-2 py-1 rounded transition-colors text-warning-400 hover:bg-warning-500/10"
                          >
                            Reset
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(voter.id)}
                          disabled={voter.hasVoted}
                          className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                            voter.hasVoted 
                              ? 'text-slate-600 cursor-not-allowed hidden' 
                              : 'text-error-400 hover:bg-error-500/10'
                          }`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-glass-border pt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-slate-500">
                Page <span className="text-white font-medium">{page}</span> of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </Card>
      </div>

      <VoterImportModal 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
        onSuccess={() => { fetchVoters(); }}
      />
      
      <AddVoterModal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        onSuccess={() => { fetchVoters(); }}
      />
    </AdminShell>
  );
}
