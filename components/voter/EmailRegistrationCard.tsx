'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SmartPhoneInput from '@/components/ui/PhoneInput';
import OtpInput from '@/components/voter/OtpInput';
import Input from '@/components/ui/Input';
import { normalizePhone } from '@/lib/phone';
import Link from 'next/link';

type Step = 'PHONE' | 'EMAIL_ENTRY' | 'OTP_VERIFY' | 'SUCCESS';

export default function EmailRegistrationCard() {
  const [step, setStep] = useState<Step>('PHONE');
  const [localPhone, setLocalPhone] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [email, setEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);

  const otpCode = useMemo(() => otp.join(''), [otp]);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handlePhoneContinue = async () => {
    const parsed = normalizePhone(localPhone);
    if (!parsed) {
      setError('Use a valid Kenyan mobile number (07xx or 01xx).');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/voter/check-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: parsed }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Check failed.');
        setLoading(false);
        return;
      }

      const data = json.data;
      setNormalizedPhone(parsed);

      if (data.isRegistered) {
        setMaskedEmail(data.maskedEmail);
        setIsAlreadyRegistered(true);
        setStep('SUCCESS');
      } else {
        setIsAlreadyRegistered(false);
        setStep('EMAIL_ENTRY');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendVerification = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/voter/register-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone, email }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Could not send verification code.');
        setLoading(false);
        return;
      }

      const data = json.data;
      setMaskedEmail(data.maskedEmail || email);
      setExpiresAt(data.expiresAt);
      setCooldownSeconds(data.cooldownSeconds ?? 60);
      setOtp(Array(6).fill(''));
      setStep('OTP_VERIFY');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (code: string) => {
    if (code.length !== 6) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/voter/register-email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone, email, code }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Verification failed.');
        setOtp(Array(6).fill(''));
        setLoading(false);
        return;
      }

      setStep('SUCCESS');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/voter/register-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone, email }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Could not resend code.');
        setLoading(false);
        return;
      }

      const data = json.data;
      setExpiresAt(data.expiresAt);
      setCooldownSeconds(data.cooldownSeconds ?? 60);
      setOtp(Array(6).fill(''));
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padding="xl" className="relative overflow-hidden border-white/20 bg-gradient-to-b from-surface-800/90 via-surface-900/85 to-surface-900/70 backdrop-blur-xl shadow-[0_30px_80px_rgba(15,23,42,0.6)] p-4 sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-accent-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl" />

      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-accent-300/80">Pre-Election Setup</p>
      <h1 className="mb-2 text-xl sm:text-2xl md:text-3xl font-bold text-white">Register Your Email</h1>
      <p className="mb-4 sm:mb-6 text-xs sm:text-sm text-slate-300">
        Link your email to receive voting OTPs on election day.
      </p>

      {error && (
        <p className="mb-4 rounded-lg border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-300">{error}</p>
      )}

      {step === 'PHONE' && (
        <div className="space-y-4">
          <SmartPhoneInput value={localPhone} onChange={setLocalPhone} disabled={loading} autoFocus />
          <Button className="w-full min-h-10 sm:min-h-12" onClick={handlePhoneContinue} loading={loading}>
            Continue
          </Button>
        </div>
      )}

      {step === 'EMAIL_ENTRY' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-surface-800/50 border border-glass-border p-3">
            <p className="text-xs text-slate-500 mb-1">Phone Number</p>
            <p className="text-sm font-medium text-white">{normalizedPhone}</p>
          </div>

          <Input
            label="Email Address"
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            hint="Enter the email where you want to receive your voting OTP."
            autoFocus
          />

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => { setStep('PHONE'); setError(null); }} disabled={loading} className="min-h-10 sm:min-h-12">
              Back
            </Button>
            <Button className="min-h-10 sm:min-h-12" onClick={handleSendVerification} loading={loading} disabled={!email}>
              Send Code
            </Button>
          </div>
        </div>
      )}

      {step === 'OTP_VERIFY' && (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-300">
              A 6-digit code was sent to <span className="font-semibold text-white">{maskedEmail}</span>
            </p>
            <button className="mt-1 text-xs text-brand-400 hover:text-brand-300" onClick={() => { setStep('EMAIL_ENTRY'); setError(null); }} type="button">
              Change email
            </button>
          </div>

          <OtpInput value={otp} onChange={setOtp} onComplete={handleVerifyOTP} disabled={loading} />

          {expiresAt && (
            <p className="text-xs text-slate-400">
              Code expires at {new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Button className="min-h-10 sm:min-h-12" loading={loading} onClick={() => handleVerifyOTP(otpCode)} disabled={otpCode.length !== 6}>
              Verify & Link
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={handleResendOTP}
              disabled={loading || cooldownSeconds > 0}
              className="min-h-10 sm:min-h-12"
            >
              {cooldownSeconds > 0 ? `Resend ${cooldownSeconds}s` : 'Resend'}
            </Button>
          </div>
        </div>
      )}

      {step === 'SUCCESS' && (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-500/15 border border-accent-500/30">
            <svg className="h-8 w-8 text-accent-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white mb-2">
              {isAlreadyRegistered ? 'Account Secure' : 'Email Verified!'}
            </h2>
            <p className="text-sm text-slate-300">
              {isAlreadyRegistered 
                ? 'Your account is already linked to a verified email address.'
                : 'Your email has been verified and linked to your voter account.'}
            </p>
            {maskedEmail && (
              <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Associated Email</p>
                <p className="text-sm font-bold text-white">{maskedEmail}</p>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-4 leading-relaxed">
              On election day, your secure voting OTP will be sent to this email address.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/" className="w-full">
              <Button variant="outline" className="w-full border-white/10 hover:bg-white/5">
                Return to Home
              </Button>
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}
