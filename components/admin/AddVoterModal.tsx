'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface AddVoterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddVoterModal({ isOpen, onClose, onSuccess }: AddVoterModalProps) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/voters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name, email: email || null }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add voter');

      onSuccess();
      setPhone('');
      setName('');
      setEmail('');
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-surface-800 border border-glass-border rounded-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-glass-border flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Add Voter</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p className="text-sm text-error-500 bg-error-500/10 p-3 rounded-lg border border-error-500/20">{error}</p>
          )}

          <Input
            label="Phone Number"
            placeholder="e.g. +254712345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            hint="E.164 format or standard Kenyan number."
          />

          <Input
            label="Full Name (Optional)"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Email (Optional)"
            type="email"
            placeholder="voter@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            hint="If provided, voter will still need to self-verify before election day."
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" loading={loading} disabled={!phone}>
              Save Voter
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
