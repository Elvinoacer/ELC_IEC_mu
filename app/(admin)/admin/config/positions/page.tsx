'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminShell from '@/components/layouts/AdminShell';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface Position {
  id: number;
  title: string;
  displayOrder: number;
  _count: {
    candidates: number;
    votes: number;
  };
}

export default function AdminPositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPositions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/positions');
      const json = await res.json();
      if (res.ok) setPositions(json.data);
    } catch {
      setError('Failed to fetch positions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchPositions();
    };
    init();
  }, [fetchPositions]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      setNewTitle('');
      setIsAdding(false);
      fetchPositions();
    } catch {
      setError('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this position?')) return;
    try {
      const res = await fetch(`/api/admin/positions/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      fetchPositions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === positions.length - 1) return;

    const newPositions = [...positions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    const temp = newPositions[index];
    newPositions[index] = newPositions[targetIndex];
    newPositions[targetIndex] = temp;

    // Update state optimistically
    setPositions(newPositions);

    // Persist changes
    try {
      await Promise.all([
        fetch(`/api/admin/positions/${newPositions[index].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayOrder: index + 1 }),
        }),
        fetch(`/api/admin/positions/${newPositions[targetIndex].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayOrder: targetIndex + 1 }),
        })
      ]);
      fetchPositions(); // Refresh to ensure sync
    } catch (err) {
      alert('Failed to update order');
      fetchPositions(); // Revert on failure
    }
  };

  return (
    <AdminShell title="Ballot Positions">
      <div className="fade-in space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Manage positions and their display order on the ballot.</p>
          </div>
          <Button onClick={() => setIsAdding(true)}>
            + Add Position
          </Button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-error-500/10 border border-error-500/20 text-error-400 text-sm">
            {error}
          </div>
        )}

        {isAdding && (
          <Card padding="lg" className="border-brand-500/30">
            <h3 className="text-lg font-bold text-white mb-4">Add New Position</h3>
            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <Input 
                  label="Position Title" 
                  placeholder="e.g. Secretary General"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button type="button" variant="ghost" onClick={() => setIsAdding(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" loading={isSubmitting} className="flex-1 sm:flex-none">
                  Save
                </Button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading positions...</div>
        ) : positions.length === 0 ? (
          <Card padding="xl" className="text-center text-slate-400 border-dashed border-2">
            No positions created yet.
          </Card>
        ) : (
          <Card padding="none" className="overflow-hidden">
            <ul className="divide-y divide-white/5">
              {positions.map((pos, index) => (
                <li key={pos.id} className="p-4 flex items-center justify-between hover:bg-surface-800 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0}
                        className="text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === positions.length - 1}
                        className="text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">{pos.title}</h3>
                      <div className="text-xs text-slate-400 mt-1 flex gap-4">
                        <span>{pos._count.candidates} Candidates</span>
                        <span>{pos._count.votes} Votes</span>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleDelete(pos.id)}
                    className="p-2 text-error-400/70 hover:text-error-400 hover:bg-error-400/10 rounded-lg transition-colors"
                    title="Delete position"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </AdminShell>
  );
}
