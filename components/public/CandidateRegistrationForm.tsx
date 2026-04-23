'use client';

import React, { useState, useRef } from 'react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface Position {
  id: number;
  title: string;
}

interface Props {
  positions: Position[];
}

type Step = 'PHONE' | 'OTP' | 'FORM' | 'SUCCESS';

export default function CandidateRegistrationForm({ positions }: Props) {
  const [step, setStep] = useState<Step>('PHONE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Phone Step
  const [phone, setPhone] = useState('');
  
  // OTP Step
  const [otp, setOtp] = useState('');

  // Form Step
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [position, setPosition] = useState('');
  const [scholarCode, setScholarCode] = useState('');
  const [scholarCodeError, setScholarCodeError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateScholarCode = async (code: string) => {
    if (!code) return;
    try {
      const res = await fetch(`/api/candidates/validate-scholar-code?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!data.data.available) {
        setScholarCodeError(data.data.message);
      } else {
        setScholarCodeError(null);
      }
    } catch (err) {
      console.error('Failed to validate scholar code:', err);
    }
  };

  const handleSendPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch('/api/candidates/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send verification code');
      if (data.data?.alreadySent) {
        setInfo('A valid OTP is already active for this phone. Please use the previously sent code.');
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
      const res = await fetch('/api/candidates/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to verify OTP');
      setStep('FORM');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) {
      setError('Please upload a candidate photo');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('phone', phone); // Verified phone
      formData.append('school', school);
      formData.append('yearOfStudy', yearOfStudy);
      formData.append('position', position);
      formData.append('scholarCode', scholarCode);
      formData.append('photo', photo);

      const res = await fetch('/api/candidates/register', {
        method: 'POST',
        body: formData, // fetch automatically sets multipart/form-data boundary
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit application');
      
      setStep('SUCCESS');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padding="lg" className="backdrop-blur-md bg-surface-900/60 border border-white/10 shadow-2xl">
      {/* Progress Steps Header */}
      {step !== 'SUCCESS' && (
        <div className="flex items-center justify-between mb-8 pb-8 border-b border-white/5 relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/5 -z-10 -translate-y-1/2 rounded" />
          
          <div className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
              step === 'PHONE' ? 'bg-brand-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 
              'bg-brand-500/20 text-brand-400 border border-brand-500/30'
            }`}>
              1
            </div>
            <span className={`text-xs font-medium ${step === 'PHONE' ? 'text-white' : 'text-slate-400'}`}>Phone</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
              step === 'OTP' ? 'bg-brand-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 
              step === 'FORM' ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' :
              'bg-surface-800 text-slate-500 border border-white/10'
            }`}>
              2
            </div>
            <span className={`text-xs font-medium ${step === 'OTP' ? 'text-white' : 'text-slate-400'}`}>Verify</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
              step === 'FORM' ? 'bg-brand-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 
              'bg-surface-800 text-slate-500 border border-white/10'
            }`}>
              3
            </div>
            <span className={`text-xs font-medium ${step === 'FORM' ? 'text-white' : 'text-slate-400'}`}>Details</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-error-500/10 border border-error-500/20 flex items-start gap-3">
          <svg className="w-5 h-5 text-error-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-error-400">{error}</p>
        </div>
      )}

      {info && (
        <div className="mb-6 rounded-xl border border-brand-500/20 bg-brand-500/10 p-4 text-sm text-brand-200">
          {info}
        </div>
      )}

      {/* STEP 1: PHONE */}
      {step === 'PHONE' && (
        <form onSubmit={handleSendPhone} className="space-y-6 fade-in">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Verify Eligibility</h2>
            <p className="text-sm text-slate-400">
              Enter your registered ELP Moi Chapter phone number. Only registered voters can run for positions.
            </p>
          </div>
          <Input
            label="Phone Number"
            placeholder="+254712345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <Button type="submit" loading={loading} className="w-full" size="lg">
            Send Verification Code
          </Button>
        </form>
      )}

      {/* STEP 2: OTP */}
      {step === 'OTP' && (
        <form onSubmit={handleVerifyOtp} className="space-y-6 fade-in">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Enter Verification Code</h2>
            <p className="text-sm text-slate-400">
              We have sent a 6-digit code to <span className="font-medium text-white">{phone}</span>.
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
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="button" variant="outline" onClick={() => setStep('PHONE')} className="w-full sm:w-auto" disabled={loading}>
              Change Number
            </Button>
            <Button type="submit" loading={loading} className="w-full sm:flex-1" size="lg">
              Verify Code
            </Button>
          </div>
        </form>
      )}

      {/* STEP 3: FORM */}
      {step === 'FORM' && (
        <form onSubmit={handleFinalSubmit} className="space-y-6 fade-in">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Candidate Details</h2>
            <p className="text-sm text-slate-400">
              Your phone number has been verified. Complete the form below to submit your candidacy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Full Name"
              placeholder="As it should appear on ballot"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Scholar Code / PF Number"
              placeholder="e.g. PF12345"
              value={scholarCode}
              onChange={(e) => {
                setScholarCode(e.target.value);
                if (scholarCodeError) setScholarCodeError(null);
              }}
              onBlur={(e) => validateScholarCode(e.target.value)}
              error={scholarCodeError || undefined}
              required
            />
            <Input
              label="School / Campus"
              placeholder="e.g. School of Engineering"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              required
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-300">Year of Study</label>
              <select
                value={yearOfStudy}
                onChange={(e) => setYearOfStudy(e.target.value)}
                required
                className="w-full px-4 py-3 bg-surface-900 border border-glass-border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all appearance-none"
              >
                <option value="" disabled>Select Year</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="5th Year">5th Year</option>
                <option value="6th Year">6th Year</option>
                <option value="Postgraduate">Postgraduate</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">Position Running For</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              required
              className="w-full px-4 py-3 bg-surface-900 border border-glass-border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all appearance-none"
            >
              <option value="" disabled>Select Position</option>
              {positions.map((pos) => (
                <option key={pos.id} value={pos.title}>{pos.title}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">Candidate Photo</label>
            <div 
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                photo ? 'border-brand-500 bg-brand-500/5' : 'border-glass-border hover:border-brand-500/50'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                accept="image/jpeg, image/png, image/jpg"
                className="hidden"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setPhoto(e.target.files[0]);
                  }
                }}
              />
              {photo ? (
                <div className="flex flex-col items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(photo)} alt="Preview" className="w-24 h-24 object-cover rounded-full mb-3 border-2 border-brand-500 shadow-lg shadow-brand-500/20" />
                  <p className="text-sm font-medium text-brand-400">{photo.name}</p>
                  <p className="text-xs text-slate-500 mt-1">Click to change</p>
                </div>
              ) : (
                <>
                  <svg className="mx-auto h-12 w-12 text-slate-500 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <p className="text-sm text-slate-300 font-medium">Upload a professional photo</p>
                  <p className="text-xs text-slate-500 mt-1">JPG or PNG, max 2MB. Clear face visibility required.</p>
                </>
              )}
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Submit Application
          </Button>
        </form>
      )}

      {/* STEP 4: SUCCESS */}
      {step === 'SUCCESS' && (
        <div className="text-center py-8 fade-in space-y-6">
          <div className="w-20 h-20 bg-success-500/20 rounded-full flex items-center justify-center mx-auto border border-success-500/30">
            <svg className="w-10 h-10 text-success-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-3">Application Received</h2>
            <p className="text-slate-300 max-w-sm mx-auto">
              Your candidacy application has been successfully submitted. The IEC will review your details.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-surface-800 border border-white/5 text-sm text-slate-400">
            You will receive an SMS notification at <strong className="text-white">{phone}</strong> once your status is updated.
          </div>
          <Button variant="outline" className="w-full" onClick={() => window.location.href = '/'}>
            Return Home
          </Button>
        </div>
      )}
    </Card>
  );
}
