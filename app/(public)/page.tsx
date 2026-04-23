'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PublicShell from '@/components/layouts/PublicShell';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { generateDeviceFingerprint } from '@/lib/fingerprint';

type Step = 'PHONE' | 'OTP';

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('PHONE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fingerprint, setFingerprint] = useState<string>('');

  useEffect(() => {
    // Generate fingerprint on mount
    generateDeviceFingerprint().then(setFingerprint);
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vote/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 409) {
          // Already voted -> Results with message
          router.push('/results?voted=true');
          return;
        }
        throw new Error(data.error);
      }
      setStep('OTP');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vote/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otp, deviceHash: fingerprint }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      if (data.deviceWarning) {
        const proceed = window.confirm(
          "WARNING: A different device was previously used to start a session for this number.\n\n" +
          "If you recently switched devices or cleared your browser data, click OK to continue.\n" +
          "If you suspect someone else is trying to use your number, contact the IEC immediately!"
        );
        if (!proceed) {
          setLoading(false);
          return;
        }
      }
      
      // Navigate to ballot
      router.push('/vote');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicShell>
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        
        <div className="text-center mb-10 fade-in">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 font-[family-name:var(--font-outfit)] tracking-tight">
            ELP Moi Chapter <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-blue-300">Elections</span>
          </h1>
          <p className="text-slate-300 max-w-lg mx-auto">
            Welcome to the official voting portal. Secure, transparent, and real-time.
          </p>
        </div>

        <div className="w-full max-w-md slide-up">
          <Card padding="xl" className="backdrop-blur-md bg-surface-900/60 border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
            
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-error-500/10 border border-error-500/20 text-error-400 text-sm flex items-start gap-3">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            {step === 'PHONE' ? (
              <form onSubmit={handleSendOtp} className="space-y-6 fade-in">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Voter Login</h2>
                  <p className="text-sm text-slate-400">Enter your registered ELP phone number to receive a secure access code.</p>
                </div>
                <Input
                  label="Phone Number"
                  placeholder="+254712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoFocus
                />
                <Button type="submit" loading={loading} className="w-full" size="lg">
                  Get Access Code
                </Button>
                
                <div className="text-center pt-4">
                  <a href="/results" className="text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors">
                    View Live Results &rarr;
                  </a>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-6 fade-in">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Verify Access Code</h2>
                  <p className="text-sm text-slate-400">
                    We sent a 6-digit code to <span className="text-white font-medium">{phone}</span>
                  </p>
                </div>
                <Input
                  label="6-Digit OTP"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  className="text-center tracking-[0.5em] text-2xl font-bold"
                  autoFocus
                />
                <div className="flex flex-col gap-3">
                  <Button type="submit" loading={loading} className="w-full" size="lg">
                    Access Ballot
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setStep('PHONE')} disabled={loading}>
                    Change Number
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>

      </div>
    </PublicShell>
  );
}
