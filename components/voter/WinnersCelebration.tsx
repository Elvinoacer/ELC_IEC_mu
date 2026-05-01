"use client";

import React, { useEffect, useMemo } from "react";
import confetti from "canvas-confetti";
import type { ResultsPayload } from "@/lib/results";

interface WinnersCelebrationProps {
  data: ResultsPayload | null;
}

export default function WinnersCelebration({ data }: WinnersCelebrationProps) {
  useEffect(() => {
    // Fire confetti on mount
    const duration = 15 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, start a bit higher than random
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const winners = useMemo(() => {
    if (!data) return [];
    return data.positions
      .filter((pos) => pos.candidates.length > 0) // Only include positions with candidates
      .map((pos) => {
        const winner = [...pos.candidates].sort((a, b) => b.votes - a.votes)[0];
        return {
          position: pos.title,
          winner,
          totalVotes: pos.totalVotes,
        };
      });
  }, [data]);

  if (!data) return null;

  return (
    <div className="w-full py-12 px-4 animate-in fade-in duration-1000">
      <div className="max-w-6xl mx-auto text-center space-y-12">
        {/* Celebration Header */}
        <div className="space-y-6 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-brand-500/10 blur-[120px] rounded-full -z-10" />

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-success-500/10 border border-success-500/20 mb-4 animate-bounce">
            <span className="flex h-2 w-2 rounded-full bg-success-500"></span>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-success-400">
              Elections Finalized
            </p>
          </div>

          <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase italic leading-[0.8] drop-shadow-2xl">
            Meet Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 via-accent-500 to-brand-500 bg-[length:200%_auto] animate-gradient">
              Leaders
            </span>
          </h1>

          <p className="text-slate-400 max-w-xl mx-auto font-medium text-lg leading-relaxed">
            The people have spoken. Congratulations to the newly elected ELP Moi
            Chapter leaders for the 2026 term.
          </p>
        </div>

        {/* Winners Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-12">
          {winners.map((item, idx) => (
            <div key={idx} className="group relative">
              {/* Card Glow Effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-accent-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-500"></div>

              <div className="relative bg-surface-900 border border-white/10 rounded-[2.2rem] p-8 flex flex-col items-center text-center space-y-6 overflow-hidden">
                {/* Position Badge */}
                <div className="absolute top-0 right-0 px-6 py-2 bg-brand-600 rounded-bl-3xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl">
                  {item.position}
                </div>

                {/* Winner Photo */}
                <div className="relative mt-4">
                  <div className="absolute inset-0 bg-brand-500/30 blur-2xl rounded-full scale-125" />
                  <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border-4 border-brand-500 shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500">
                    <img
                      src={item.winner?.photoUrl || "/placeholder-avatar.png"}
                      alt={item.winner?.name || "Candidate"}
                      className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-700"
                    />
                  </div>
                  {/* Crown Icon */}
                  <div className="absolute -top-4 -left-4 bg-yellow-500 text-white p-3 rounded-2xl shadow-xl -rotate-12">
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                    {item.winner?.name || "Unknown Candidate"}
                  </h3>
                  <div className="flex flex-col items-center">
                    <span className="text-brand-400 font-black text-2xl">
                      {item.winner?.votes || 0}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Total Votes Won
                    </span>
                  </div>
                </div>

                <div className="w-full pt-4">
                  <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent w-full mb-4" />
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
                    Mandate Secured
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Closing Action */}
        <div className="pt-12">
          <div className="inline-block p-1 rounded-3xl bg-gradient-to-r from-brand-500 to-accent-500">
            <div className="px-10 py-5 rounded-[1.4rem] bg-surface-950 flex flex-col md:flex-row items-center gap-6">
              <div className="text-left">
                <p className="text-white font-bold text-lg">
                  Official Gazettement complete.
                </p>
                <p className="text-slate-500 text-sm">
                  IEC Audited Results verified at{" "}
                  {new Date().toLocaleDateString()}
                </p>
              </div>
              <div className="h-10 w-px bg-white/10 hidden md:block" />
              <button
                onClick={() => window.location.reload()}
                className="bg-brand-600 hover:bg-brand-500 text-white font-black uppercase tracking-widest text-xs px-8 py-3 rounded-xl transition-all shadow-xl shadow-brand-900/40"
              >
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
