'use client';

import React, { useState, useRef } from 'react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import CustomSelect from '@/components/ui/Select';
import SmartPhoneInput from '@/components/ui/PhoneInput';

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
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);

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
      
      if (data.data?.maskedEmail) {
        setMaskedEmail(data.data.maskedEmail);
      }

      if (data.data?.alreadySent) {
        setInfo('A valid OTP is already active for this account. Please use the code sent to your email.');
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
    <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-8 md:p-12">
      {/* Progress Steps Header */}
      {step !== 'SUCCESS' && (
        <div className="flex items-center justify-between mb-12 pb-8 border-b border-white/5 relative">
          <div className="absolute top-[20px] left-0 right-0 h-0.5 bg-white/5 -z-10 rounded" />
          
          <div className="flex flex-col items-center gap-3 relative z-10">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base transition-all duration-500 ${
              step === 'PHONE' ? 'bg-brand-600 text-white shadow-[0_0_30px_rgba(163,42,41,0.4)] rotate-3' : 
              'bg-brand-600/10 text-brand-400 border border-brand-500/20'
            }`}>
              {step !== 'PHONE' && (step === 'OTP' || step === 'FORM') ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              ) : '01'}
            </div>
            <span className={`text-[10px] uppercase font-black tracking-widest ${step === 'PHONE' ? 'text-white' : 'text-slate-500'}`}>Phone</span>
          </div>

          <div className="flex flex-col items-center gap-3 relative z-10">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base transition-all duration-500 ${
              step === 'OTP' ? 'bg-brand-600 text-white shadow-[0_0_30px_rgba(163,42,41,0.4)] rotate-3' : 
              step === 'FORM' ? 'bg-brand-600/10 text-brand-400 border border-brand-500/20' :
              'bg-surface-800 text-slate-600 border border-white/5'
            }`}>
              {step === 'FORM' ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              ) : '02'}
            </div>
            <span className={`text-[10px] uppercase font-black tracking-widest ${step === 'OTP' ? 'text-white' : 'text-slate-500'}`}>Verify</span>
          </div>

          <div className="flex flex-col items-center gap-3 relative z-10">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base transition-all duration-500 ${
              step === 'FORM' ? 'bg-brand-600 text-white shadow-[0_0_30px_rgba(163,42,41,0.4)] rotate-3' : 
              'bg-surface-800 text-slate-600 border border-white/5'
            }`}>
              03
            </div>
            <span className={`text-[10px] uppercase font-black tracking-widest ${step === 'FORM' ? 'text-white' : 'text-slate-500'}`}>Details</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-8 p-5 rounded-2xl bg-error-500/10 border border-error-500/20 flex items-start gap-4 animate-shake">
          <div className="bg-error-500/20 p-2 rounded-lg">
            <svg className="w-5 h-5 text-error-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-error-300 leading-relaxed">{error}</p>
        </div>
      )}

      {info && (
        <div className="mb-8 rounded-2xl border border-brand-500/20 bg-brand-500/10 p-5 text-sm text-brand-200 flex items-center gap-3">
          <svg className="w-5 h-5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="font-medium">{info}</span>
        </div>
      )}

      {/* STEP 1: PHONE */}
      {step === 'PHONE' && (
        <form onSubmit={handleSendPhone} className="space-y-8 fade-in">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">Verify Eligibility</h2>
            <p className="text-slate-400 leading-relaxed">
              Enter your registered ELP Moi Chapter phone number. Only pre-registered scholars can apply for candidacy.
            </p>
          </div>
          <div className="space-y-4">
            <SmartPhoneInput
              label="Phone Number"
              placeholder="+254 7XX XXX XXX"
              value={phone}
              onChange={setPhone}
              required
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:ring-brand-500/30"
            />
            <Button type="submit" loading={loading} className="w-full bg-brand-600 hover:bg-brand-500 py-4 text-base font-bold shadow-xl shadow-brand-900/20" size="lg">
              Send Verification Code
            </Button>
          </div>
        </form>
      )}

      {/* STEP 2: OTP */}
      {step === 'OTP' && (
        <form onSubmit={handleVerifyOtp} className="space-y-8 fade-in">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold text-white tracking-tight">Secure Verification</h2>
            <p className="text-slate-400">
              We've sent a secure 6-digit code to your registered email: <br />
              <span className="font-bold text-brand-400 tracking-wider text-lg">{maskedEmail || 'your email'}</span>
            </p>
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 pt-2 italic">
              Please check your inbox (and spam folder) for the code.
            </p>
          </div>
          
          <div className="flex justify-center">
            <Input
              label=""
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              maxLength={6}
              className="text-center tracking-[0.8em] text-4xl font-black bg-white/5 border-white/10 w-full max-w-[280px] h-20 rounded-2xl focus:ring-accent-500/30"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => setStep('PHONE')} className="w-full sm:w-auto border-white/10 text-slate-400 hover:bg-white/5" disabled={loading}>
              Back
            </Button>
            <Button type="submit" loading={loading} className="w-full sm:flex-1 bg-brand-600 hover:bg-brand-500 py-4 text-base font-bold shadow-xl shadow-brand-900/20" size="lg">
              Verify Identity
            </Button>
          </div>
        </form>
      )}

      {/* STEP 3: FORM */}
      {step === 'FORM' && (
        <form onSubmit={handleFinalSubmit} className="space-y-10 fade-in">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">Complete Your Profile</h2>
            <p className="text-slate-400">Identity verified. Please provide your candidacy details for the ballot.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Input
              label="Full Official Name"
              placeholder="e.g. Jane Mary Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-white/5 border-white/10"
            />
            <Input
              label="Scholar Code / PF"
              placeholder="e.g. PF123456"
              value={scholarCode}
              onChange={(e) => {
                setScholarCode(e.target.value);
                if (scholarCodeError) setScholarCodeError(null);
              }}
              onBlur={(e) => validateScholarCode(e.target.value)}
              error={scholarCodeError || undefined}
              required
              className="bg-white/5 border-white/10"
            />
            <Input
              label="School / Department"
              placeholder="e.g. School of Arts"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              required
              className="bg-white/5 border-white/10"
            />
            <CustomSelect
              label="Year of Study"
              placeholder="Select Year"
              value={yearOfStudy}
              onChange={(val) => setYearOfStudy(val)}
              options={[
                { value: '1st Year', label: '1st Year' },
                { value: '2nd Year', label: '2nd Year' },
                { value: '3rd Year', label: '3rd Year' },
                { value: '4th Year', label: '4th Year' },
                { value: '5th Year', label: '5th Year' },
                { value: '6th Year', label: '6th Year' },
                { value: 'Postgraduate', label: 'Postgraduate' },
              ]}
              required
            />
          </div>

          <CustomSelect
            label="Target Position"
            placeholder="Choose a leadership role"
            value={position}
            onChange={(val) => setPosition(val)}
            options={positions.map(p => ({ value: p.title, label: p.title }))}
            required
          />

          <div className="space-y-3">
            <label className="block text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Ballot Photography</label>
            <div 
              className={`relative border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-300 group overflow-hidden ${
                photo ? 'border-brand-500 bg-brand-500/5' : 'border-white/10 bg-white/2 hover:border-brand-500/50 hover:bg-white/5'
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
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-brand-500/20 blur-xl rounded-full scale-110"></div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={URL.createObjectURL(photo)} alt="Preview" className="relative w-32 h-32 object-cover rounded-3xl border-4 border-brand-500 shadow-2xl" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white tracking-tight">{photo.name}</p>
                    <p className="text-xs text-brand-400 font-medium mt-1">Ready for upload • Click to change</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-brand-400 group-hover:scale-110 transition-all duration-300">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-base text-white font-bold tracking-tight">Upload Candidate Photo</p>
                    <p className="text-xs text-slate-500 font-medium px-8">High-resolution JPEG or PNG. Professional attire recommended for ballot visibility.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full bg-brand-600 hover:bg-brand-500 py-5 text-lg font-black tracking-widest uppercase shadow-2xl shadow-brand-900/40" size="lg">
            Complete Registration
          </Button>
        </form>
      )}

      {/* STEP 4: SUCCESS */}
      {step === 'SUCCESS' && (
        <div className="text-center py-12 space-y-10 fade-in">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-success-500/20 blur-3xl rounded-full scale-150"></div>
            <div className="relative w-24 h-24 bg-success-500/10 rounded-3xl flex items-center justify-center border-2 border-success-500/30 rotate-3">
              <svg className="w-12 h-12 text-success-500" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          </div>
          
          <div className="space-y-3">
            <h2 className="text-4xl font-black text-white tracking-tight">Application Filed!</h2>
            <p className="text-lg text-slate-400 max-w-sm mx-auto leading-relaxed">
              Your candidacy for the ELP Moi Chapter elections has been successfully recorded.
            </p>
          </div>

          <div className="max-w-md mx-auto p-6 rounded-3xl bg-white/2 border border-white/5 space-y-4">
            <p className="text-sm text-slate-400 leading-relaxed font-medium">
              The Independent Electoral Commission (IEC) will now verify your details. You will be notified via SMS at <span className="text-white font-bold">{phone}</span> once a decision is made.
            </p>
            <div className="h-px bg-white/5 w-1/2 mx-auto"></div>
            <div className="flex justify-center gap-4">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">Status</span>
                <span className="text-xs text-brand-400 font-bold">PENDING REVIEW</span>
              </div>
            </div>
          </div>

          <Button className="w-full max-w-xs mx-auto border-white/10 hover:bg-white/5" variant="outline" onClick={() => window.location.href = '/'}>
            Return to Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
