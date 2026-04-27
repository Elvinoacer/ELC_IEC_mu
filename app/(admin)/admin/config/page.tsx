'use client';

import React, { useState, useEffect } from 'react';
import AdminShell from '@/components/layouts/AdminShell';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

// Helper to format date for datetime-local input (YYYY-MM-DDThh:mm)
function toLocalISOString(dateStr: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [voterRegOpensAt, setVoterRegOpensAt] = useState('');
  const [voterRegClosesAt, setVoterRegClosesAt] = useState('');
  const [isManuallyClosed, setIsManuallyClosed] = useState(false);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch('/api/admin/config');
        const json = await res.json();
        if (res.ok && json.data) {
          setOpensAt(toLocalISOString(json.data.opensAt));
          setClosesAt(toLocalISOString(json.data.closesAt));
          setVoterRegOpensAt(toLocalISOString(json.data.voterRegOpensAt));
          setVoterRegClosesAt(toLocalISOString(json.data.voterRegClosesAt));
          setIsManuallyClosed(json.data.isManuallyClosed);
        }
      } catch {
        setError('Failed to load configuration');
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        opensAt: opensAt ? new Date(opensAt).toISOString() : undefined,
        closesAt: closesAt ? new Date(closesAt).toISOString() : undefined,
        voterRegOpensAt: voterRegOpensAt ? new Date(voterRegOpensAt).toISOString() : null,
        voterRegClosesAt: voterRegClosesAt ? new Date(voterRegClosesAt).toISOString() : null,
        isManuallyClosed,
      };

      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update config');

      setSuccess('Configuration updated successfully.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEmergencyToggle = async () => {
    const newValue = !isManuallyClosed;
    const msg = newValue 
      ? 'EMERGENCY STOP: Are you sure you want to instantly close the voting system? All voting will be blocked immediately.' 
      : 'Are you sure you want to re-open the voting system (subject to the scheduled windows)?';
    
    if (!window.confirm(msg)) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isManuallyClosed: newValue }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setIsManuallyClosed(newValue);
      setSuccess(`System ${newValue ? 'closed' : 're-opened'} successfully.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminShell>
        <div className="text-center py-12 text-slate-400">Loading configuration...</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="System Configuration">
      <div className="fade-in space-y-6 max-w-4xl mx-auto">
        <div>
          <p className="text-sm text-slate-400">Manage election timelines and emergency controls.</p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-error-500/10 border border-error-500/20 text-error-400 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-success-500/10 border border-success-500/20 text-success-400 text-sm">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card padding="xl">
              <form onSubmit={handleSave} className="space-y-6">
                


                <div>
                  <div className="flex items-center justify-between border-b border-glass-border pb-2 mb-4">
                    <h2 className="text-lg font-bold text-white">Voter Email Registration Window</h2>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20">
                      <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                      <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">Phase 2</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-slate-300">Voter Reg Opens</label>
                      <input 
                        type="datetime-local" 
                        value={voterRegOpensAt}
                        onChange={(e) => setVoterRegOpensAt(e.target.value)}
                        className="w-full px-4 py-3 bg-surface-900 border border-glass-border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-slate-300">Voter Reg Closes</label>
                      <input 
                        type="datetime-local" 
                        value={voterRegClosesAt}
                        onChange={(e) => setVoterRegClosesAt(e.target.value)}
                        className="w-full px-4 py-3 bg-surface-900 border border-glass-border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 italic">Controls when voters can link their email to their account.</p>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-white border-b border-glass-border pb-2 mb-4">Voting Window</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-slate-300">Opens At <span className="text-error-400">*</span></label>
                      <input 
                        type="datetime-local" 
                        value={opensAt}
                        onChange={(e) => setOpensAt(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-surface-900 border border-glass-border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-slate-300">Closes At <span className="text-error-400">*</span></label>
                      <input 
                        type="datetime-local" 
                        value={closesAt}
                        onChange={(e) => setClosesAt(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-surface-900 border border-glass-border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Voters will only be able to cast their ballots between these times.</p>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button type="submit" loading={saving} size="lg">
                    Save Configuration
                  </Button>
                </div>

              </form>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Quick Links */}
            <Card padding="lg" className="bg-brand-900/20 border-brand-500/20">
              <h2 className="text-lg font-bold text-white mb-4">Positions</h2>
              <p className="text-sm text-slate-300 mb-6">Manage the ballot positions, their display order, and candidates.</p>
              <Button 
                variant="primary" 
                className="w-full justify-center" 
                onClick={() => window.location.href = '/admin/config/positions'}
              >
                Manage Positions
              </Button>
            </Card>

            {/* Emergency Controls */}
            <Card padding="lg" className="border-error-500/30 bg-error-500/5">
              <h2 className="text-lg font-bold text-error-400 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Emergency Controls
              </h2>
              <p className="text-sm text-slate-300 mb-6">
                Manually overriding the voting window will instantly block or allow voters regardless of the scheduled times.
              </p>
              
              <Button 
                variant={isManuallyClosed ? "outline" : "primary"}
                className={`w-full justify-center ${isManuallyClosed ? 'border-success-500/30 text-success-400 hover:bg-success-500/10' : 'bg-error-600 hover:bg-error-500 text-white border-none'}`}
                onClick={handleEmergencyToggle}
                disabled={saving}
              >
                {isManuallyClosed ? 'Re-open System' : 'EMERGENCY STOP (Close Voting)'}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
