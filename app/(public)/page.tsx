'use client';

import React, { useEffect, useState } from 'react';
import PublicShell from '@/components/layouts/PublicShell';
import AuthCard from '@/components/voter/AuthCard';
import ResultsPanel from '@/components/voter/ResultsPanel';
import Countdown from '@/components/ui/Countdown';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { getElectionPhase, type PhaseInfo } from '@/lib/phases';
import type { ResultsPayload } from '@/lib/results';
import EmailRegistrationCard from '@/components/voter/EmailRegistrationCard';

export default function Home() {
  const [resultsData, setResultsData] = useState<ResultsPayload | null>(null);
  const [phaseInfo, setPhaseInfo] = useState<PhaseInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resultsRes, configRes] = await Promise.all([
          fetch('/api/results'),
          fetch('/api/election-status')
        ]);

        const resultsJson = await resultsRes.json();
        setResultsData(resultsJson.data ?? null);

        // NOTE: The admin/config endpoint is protected. 
        // We need a public-facing version of the config or just the dates.
        // For now, I'll assume we can fetch basic status.
        // Actually, let's create a public status endpoint to avoid 401s.
        const configJson = await configRes.json();
        if (configJson.data) {
          setPhaseInfo(getElectionPhase(configJson.data));
        }
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <PublicShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
          <p className="mt-4 text-slate-500 font-bold uppercase tracking-widest text-xs">Synchronizing Protocol...</p>
        </div>
      </PublicShell>
    );
  }

  const isRegistrationPhase = phaseInfo?.phase === 'REGISTRATION_OPEN' || phaseInfo?.phase === 'UPCOMING_REGISTRATION';

  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl px-2 sm:px-4 py-6 sm:py-10 md:px-6 lg:py-16">
        
        {/* Phase Info & Countdown Section */}
        {phaseInfo && (
          <div className="flex flex-col items-center mb-16 space-y-6 fade-in">
            <div className={`inline-flex items-center gap-3 px-4 py-1.5 rounded-full border ${
              phaseInfo.color === 'brand' ? 'bg-brand-500/10 border-brand-500/20 text-brand-400' :
              phaseInfo.color === 'accent' ? 'bg-accent-500/10 border-accent-500/20 text-accent-400' :
              'bg-slate-500/10 border-slate-500/20 text-slate-400'
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full ${
                phaseInfo.color === 'brand' ? 'bg-brand-500' :
                phaseInfo.color === 'accent' ? 'bg-accent-500' :
                'bg-slate-500'
              } animate-pulse`}></span>
              <span className="text-xs font-black uppercase tracking-[0.25em]">{phaseInfo.label}</span>
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{phaseInfo.subLabel}</h2>
              {phaseInfo.targetDate && (
                <Countdown targetDate={phaseInfo.targetDate} label="Time Remaining" className="mt-8" />
              )}
            </div>
          </div>
        )}

        {isRegistrationPhase ? (
          /* VOTER REGISTRATION INTERFACE */
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start slide-up">
            <div className="lg:col-span-5 space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-black text-white leading-tight">
                  Secure Your <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-400 to-accent-600">Voice</span>
                </h1>
                <p className="text-lg text-slate-400 font-medium leading-relaxed">
                  The ELP Moi Chapter voter registry is open. Ensure your eligibility by linking your verified email address today.
                </p>
              </div>

              <div className="space-y-6">
                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Eligibility Requirements</h3>
                  <ul className="space-y-3">
                    {[
                      'Pre-registered scholar',
                      'Verified phone number',
                      'Verified email address'
                    ].map((req, i) => (
                      <li key={i} className="flex items-center gap-3 text-slate-300">
                        <div className="w-5 h-5 rounded-full bg-accent-500/20 flex items-center justify-center">
                          <svg className="w-3 h-3 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <span className="text-sm font-medium">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Link href="/register-candidate">
                    <Button variant="outline" className="w-full border-white/10 hover:bg-white/5 text-xs font-bold py-4">
                      Run for Office
                    </Button>
                  </Link>
                  <Link href="/results">
                    <Button variant="outline" className="w-full border-white/10 hover:bg-white/5 text-xs font-bold py-4">
                      View Positions
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 fade-in">
              {phaseInfo?.phase === 'REGISTRATION_OPEN' ? (
                <EmailRegistrationCard />
              ) : (
                <div className="p-12 rounded-[2.5rem] bg-white/5 border border-white/10 text-center space-y-6">
                   <div className="w-16 h-16 bg-slate-500/10 rounded-2xl flex items-center justify-center mx-auto text-slate-500">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <h3 className="text-xl font-bold text-white">Portal Opening Soon</h3>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
                    The voter registration portal will be activated once the countdown reaches zero. Ensure you have your phone ready.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* VOTING INTERFACE (Active, Upcoming or Closed) */
          <div className="grid grid-cols-1 min-[560px]:grid-cols-2 items-start gap-4 sm:gap-6 lg:grid-cols-12 lg:gap-16">
            
            {/* Left Column: Hero & Auth */}
            <div className="flex flex-col min-[560px]:col-span-1 lg:col-span-5">
              <div className="mb-5 sm:mb-8 space-y-3 sm:space-y-5">
                <h1 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight text-white lg:leading-[1.1]">
                  Vote with <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-accent-400">Confidence</span>
                </h1>
                
                <p className="max-w-md text-xs sm:text-sm md:text-base leading-relaxed text-slate-400">
                  Equity Leaders Program Moi Chapter. Secure OTP verification ensures your voice is heard. Real-time auditing active.
                </p>
              </div>

              {phaseInfo?.phase === 'VOTING_OPEN' && (
                <div id="auth-card" className="fade-in">
                  <AuthCard onAlreadyVoted={() => document.getElementById('live-results')?.scrollIntoView({ behavior: 'smooth' })} />
                </div>
              )}

              {phaseInfo?.phase === 'UPCOMING_VOTING' && (
                <div className="p-8 rounded-3xl bg-white/5 border border-white/10 text-center space-y-4">
                  <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center mx-auto text-brand-500">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <h3 className="text-xl font-bold text-white">Polls are Locked</h3>
                  <p className="text-sm text-slate-400">Voting will begin automatically once the countdown reaches zero. Ensure your email is registered in advance.</p>
                  <Link href="/register-email">
                    <Button variant="outline" className="w-full mt-4 border-white/10 hover:bg-white/5">Link Your Email Now</Button>
                  </Link>
                </div>
              )}

              {phaseInfo?.phase === 'VOTING_CLOSED' && (
                <div className="p-8 rounded-3xl bg-white/5 border border-white/10 text-center space-y-4">
                  <div className="w-16 h-16 bg-success-500/10 rounded-2xl flex items-center justify-center mx-auto text-success-500">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h3 className="text-xl font-bold text-white">Elections Closed</h3>
                  <p className="text-sm text-slate-400">Voting has officially ended. You can view the final results on the right.</p>
                </div>
              )}
            </div>

            {/* Right Column: Live Results */}
            <div id="live-results" className="min-[560px]:col-span-1 lg:col-span-7 slide-up">
              <div className="relative group">
                {/* Decorative background glow */}
                <div className="absolute -inset-4 bg-brand-500/5 blur-3xl rounded-[3rem] opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                
                <div className="relative">
                  <ResultsPanel initialData={resultsData} compact />
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </PublicShell>
  );
}

