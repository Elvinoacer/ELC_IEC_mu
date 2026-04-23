'use client';

import React, { useEffect, useState } from 'react';
import PublicShell from '@/components/layouts/PublicShell';
import AuthCard from '@/components/voter/AuthCard';
import ResultsPanel from '@/components/voter/ResultsPanel';
import type { ResultsPayload } from '@/lib/results';

export default function Home() {
  const [resultsData, setResultsData] = useState<ResultsPayload | null>(null);

  useEffect(() => {
    fetch('/api/results')
      .then((res) => res.json())
      .then((json) => setResultsData(json.data ?? null))
      .catch(() => setResultsData(null));
  }, []);

  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl px-2 sm:px-4 py-6 sm:py-10 md:px-6 lg:py-20">
        <div className="grid grid-cols-1 min-[560px]:grid-cols-2 items-start gap-4 sm:gap-6 lg:grid-cols-12 lg:gap-16">
          
          {/* Left Column: Hero & Auth */}
          <div className="flex flex-col min-[560px]:col-span-1 lg:col-span-5">
            <div className="mb-5 sm:mb-8 space-y-3 sm:space-y-5">
              <div className="inline-flex items-center gap-2 bg-accent-500/10 px-2.5 py-1 rounded-full border border-accent-500/20">
                <span className="w-2 h-2 rounded-full bg-accent-500 live-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-accent-400">Live Election Protocol</span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight text-white lg:leading-[1.1]">
                Vote with <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-accent-400">Confidence</span>
              </h1>
              
              <p className="max-w-md text-xs sm:text-sm md:text-base leading-relaxed text-slate-400">
                Equity Leaders Program Moi Chapter. Secure OTP verification ensures your voice is heard. Real-time auditing active.
              </p>
            </div>

            <div id="auth-card" className="fade-in">
              <AuthCard onAlreadyVoted={() => document.getElementById('live-results')?.scrollIntoView({ behavior: 'smooth' })} />
            </div>
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
      </div>
    </PublicShell>
  );
}
