'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import PhoneInput from '@/components/voter/PhoneInput';
import OtpInput from '@/components/voter/OtpInput';
import { generateDeviceFingerprint } from '@/lib/fingerprint';
import { normalizePhone } from '@/lib/phone';

type Step = 'PHONE' | 'OTP';

export default function AuthCard({ onAlreadyVoted }: { onAlreadyVoted?: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('PHONE');
  const [localPhone, setLocalPhone] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fingerprint, setFingerprint] = useState('');
  const [alreadyVotedMessage, setAlreadyVotedMessage] = useState('');
  const [deviceCheckLoading, setDeviceCheckLoading] = useState(true);

  const otpCode = useMemo(() => otp.join(''), [otp]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const fp = await generateDeviceFingerprint();
        if (cancelled) return;
        setFingerprint(fp);

        const res = await fetch('/api/vote/auth/device-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceHash: fp }),
        });

        const json = await res.json();
        if (!cancelled && res.ok && json.data?.hasVotedOnThisDevice) {
          router.push('/results?voted=true');
        }
      } catch {
        // do not block auth flow on device pre-check failures
      } finally {
        if (!cancelled) setDeviceCheckLoading(false);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const sendOtp = async () => {
    const parsed = normalizePhone(localPhone);
    if (!parsed) {
      setError('Use a valid Kenyan mobile number (07xx or 01xx).');
      return;
    }

    setLoading(true);
    setError(null);
    setAlreadyVotedMessage('');

    const res = await fetch('/api/vote/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: parsed }),
    });

    const json = await res.json();
    if (!res.ok) {
      if (res.status === 409) {
        setAlreadyVotedMessage("You've already cast your vote! Scroll down to watch live results.");
        onAlreadyVoted?.();
        setLoading(false);
        return;
      }
      setError(json.error || 'Could not send OTP.');
      setLoading(false);
      return;
    }

    const data = json.data;
    setStep('OTP');
    setNormalizedPhone(parsed);
    setExpiresAt(data.expiresAt);
    setCooldownSeconds(data.cooldownSeconds ?? 60);
    setOtp(Array(6).fill(''));
    if (data.alreadySent) {
      setError('A valid OTP is already active for this number. Please use the code already sent.');
    }
    setLoading(false);
  };

  const verifyOtp = async (code: string) => {
    if (code.length !== 6) return;

    setLoading(true);
    setError(null);

    const res = await fetch('/api/vote/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: normalizedPhone, code, deviceHash: fingerprint }),
    });

    const json = await res.json();
    if (!res.ok) {
      setAttemptsLeft(json.attemptsLeft ?? null);
      setError(json.error || 'Code verification failed.');
      setOtp(Array(6).fill(''));
      setLoading(false);
      return;
    }

    router.push('/vote');
  };

  return (
    <Card padding="xl" className="relative overflow-hidden border-white/20 bg-gradient-to-b from-surface-800/90 via-surface-900/85 to-surface-900/70 backdrop-blur-xl shadow-[0_30px_80px_rgba(15,23,42,0.6)]">
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-accent-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl" />
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-accent-300/80">Secure Voter Access</p>
      <h1 className="mb-2 text-3xl font-bold text-white">ELP Moi Chapter Elections</h1>
      <p className="mb-6 text-sm text-slate-300">A trusted and elegant voting experience.</p>

      {deviceCheckLoading && <p className="mb-4 text-xs text-slate-400">Preparing secure device session...</p>}

      {alreadyVotedMessage && <p className="mb-4 rounded-lg border border-brand-500/20 bg-brand-500/10 p-3 text-sm text-brand-200">{alreadyVotedMessage}</p>}
      {error && <p className="mb-4 rounded-lg border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-300">{error}</p>}

      {step === 'PHONE' ? (
        <div className="space-y-4">
          <PhoneInput value={localPhone} onChange={setLocalPhone} disabled={loading} autoFocus />
          <Button className="w-full min-h-12" onClick={sendOtp} loading={loading} disabled={deviceCheckLoading}>Get My Secure Code</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-300">Code sent to <span className="font-semibold text-white">{normalizedPhone}</span></p>
            <button className="mt-1 text-xs text-brand-400 hover:text-brand-300" onClick={() => setStep('PHONE')} type="button">Change number</button>
          </div>
          <OtpInput value={otp} onChange={setOtp} onComplete={verifyOtp} disabled={loading} />
          {expiresAt && (
            <p className="text-xs text-slate-400">
              Code expires at {new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {attemptsLeft !== null ? ` · ${attemptsLeft} attempts left` : ''}
            </p>
          )}
          <div className="flex gap-3">
            <Button className="flex-1 min-h-12" loading={loading} onClick={() => verifyOtp(otpCode)} disabled={otpCode.length !== 6 || !fingerprint}>Verify Code</Button>
            <Button
              variant="outline"
              type="button"
              onClick={sendOtp}
              disabled={loading || cooldownSeconds > 0}
              className="min-h-12"
            >
              {cooldownSeconds > 0 ? `Resend ${cooldownSeconds}s` : 'Resend'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
