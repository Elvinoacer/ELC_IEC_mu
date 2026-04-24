'use client';

import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import Button from '@/components/ui/Button';

interface VoterImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function VoterImportModal({ isOpen, onClose, onSuccess }: VoterImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
      setSummary(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a CSV file first.');
      return;
    }

    setLoading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res = await fetch('/api/admin/voters/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(results.data),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to import voters');
          }

          setSummary(data.summary);
          onSuccess();
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        setError(err.message);
        setLoading(false);
      }
    });
  };

  const resetAndClose = () => {
    setFile(null);
    setError(null);
    setSummary(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-surface-800 border border-glass-border rounded-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-glass-border flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Import Voters</h2>
          <button onClick={resetAndClose} className="text-slate-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {summary ? (
            <div className="p-4 rounded-xl bg-success-500/10 border border-success-500/20">
              <h3 className="text-success-500 font-semibold mb-2">Import Successful</h3>
              <ul className="text-sm text-slate-300 space-y-1">
                <li><span className="font-medium text-white">{summary.added}</span> voters added</li>
                <li><span className="font-medium text-warning-400">{summary.skippedDuplicates}</span> duplicates skipped</li>
                <li><span className="font-medium text-error-400">{summary.skippedInvalid}</span> invalid rows skipped</li>
                <li><span className="font-medium text-slate-400">{summary.totalProcessed}</span> total processed</li>
              </ul>
              <Button className="w-full mt-4" onClick={resetAndClose}>Close</Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-400">
                Upload a CSV file with <code className="bg-surface-900 px-1 py-0.5 rounded">phone</code>, <code className="bg-surface-900 px-1 py-0.5 rounded">name</code> (optional), and <code className="bg-surface-900 px-1 py-0.5 rounded">email</code> (optional) columns.
              </p>

              <div 
                className="border-2 border-dashed border-glass-border rounded-xl p-8 text-center cursor-pointer hover:border-brand-500/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <svg className="mx-auto h-10 w-10 text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                {file ? (
                  <p className="text-sm font-medium text-brand-400">{file.name}</p>
                ) : (
                  <p className="text-sm text-slate-400">Click to select a CSV file</p>
                )}
              </div>

              {error && (
                <p className="text-sm text-error-500 bg-error-500/10 p-3 rounded-lg border border-error-500/20">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={resetAndClose} disabled={loading}>Cancel</Button>
                <Button onClick={handleImport} loading={loading} disabled={!file}>
                  Import Voters
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
