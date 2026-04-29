"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { io, Socket } from "socket.io-client";
import type { ResultsPayload } from "@/lib/results";
import NumberCounter from "@/components/ui/NumberCounter";

export default function DetailedResults({
  initialData,
  hasAlreadyVoted = false,
}: {
  initialData: ResultsPayload | null;
  hasAlreadyVoted?: boolean;
}) {
  const [data, setData] = useState<ResultsPayload | null>(initialData);
  const [connected, setConnected] = useState(false);
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [justUpdated, setJustUpdated] = useState(false);

  useEffect(() => {
    let socket: Socket | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (pollInterval) return;
      console.log("[POLLING] Socket offline, starting fallback polling...");
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch("/api/results");
          const json = await res.json();
          if (json.data) setData(json.data);
        } catch (e) {
          console.error("[POLLING] Fallback fetch failed:", e);
        }
      }, 5000);
    };

    const stopPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    if (liveEnabled) {
      const timer = setTimeout(() => {
        socket = io(
          process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001/results",
          {
            transports: ["websocket", "polling"],
          },
        );
        socket.on("connect", () => {
          setConnected(true);
          stopPolling();
        });
        socket.on("disconnect", () => {
          setConnected(false);
          startPolling();
        });
        socket.on("connect_error", () => {
          setConnected(false);
          startPolling();
        });
        socket.on("vote_cast", (payload: ResultsPayload) => {
          setData(payload);
          setLastUpdated(new Date());
          setJustUpdated(true);
          setTimeout(() => setJustUpdated(false), 2000);
          stopPolling();
        });
      }, 300);

      return () => {
        clearTimeout(timer);
        stopPolling();
        socket?.disconnect();
      };
    }
  }, [liveEnabled]);

  const positions = useMemo(() => data?.positions ?? [], [data]);
  const turnout = useMemo(
    () => data?.turnout ?? { voted: 0, total: 0, totalInSystem: 0, percentage: 0 },
    [data],
  );
  const showCandidateResults = data?.showCandidateResults ?? true;

  // Calculate circular progress offset
  const circumference = 2 * Math.PI * 58;
  const dashoffset = circumference - (turnout.percentage / 100) * circumference;

  return (
    <div className="w-full text-on-surface antialiased">
      {/* Hero Section */}
      <section className="mb-6 sm:mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-2 font-[family-name:var(--font-outfit)] tracking-tight">
              Real-Time Results Dashboard
            </h1>
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connected ? "bg-accent-500" : "bg-slate-500"}`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${connected ? "bg-accent-500" : "bg-slate-500"}`}
                ></span>
              </span>
              <p className="text-accent-400 text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                Live Election Analytics
                {justUpdated && <span className="text-success-400 animate-pulse transition-opacity duration-300">· Updated just now</span>}
                {!justUpdated && <span className="text-slate-500 font-medium normal-case tracking-normal italic opacity-60">· Last update: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
              </p>
            </div>
          </div>

          {hasAlreadyVoted && (
            <div className="bg-white/5 backdrop-blur-md border border-white/10 px-6 py-4 rounded-xl flex items-center gap-4 border-accent-500/20 shadow-xl">
              <svg
                className="w-6 h-6 text-accent-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm font-medium text-white">
                You have already cast your vote. Thank you for participating.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-6 mb-6 sm:mb-12">
        {/* Turnout Card (Large Circular) */}
        <div className="md:col-span-4 bg-white/5 backdrop-blur-md border border-white/10 p-4 sm:p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-2xl">
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 mb-3 sm:mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                className="text-white/5"
                cx="64"
                cy="64"
                fill="transparent"
                r="58"
                stroke="currentColor"
                strokeWidth="8"
              ></circle>
              <circle
                className="text-brand-500 transition-all duration-1000 ease-out"
                cx="64"
                cy="64"
                fill="transparent"
                r="58"
                stroke="currentColor"
                strokeDasharray={circumference}
                strokeDashoffset={dashoffset}
                strokeWidth="8"
                strokeLinecap="round"
              ></circle>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg sm:text-2xl font-bold text-white">
                <NumberCounter value={turnout.percentage} />%
              </span>
              <span className="text-[10px] font-bold text-slate-400 tracking-widest">
                TURNOUT
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium italic">of registered voters</p>
        </div>

        {/* Voter Breakdown Bento Widget (3-column) */}
        <div className="md:col-span-8 grid grid-cols-3 gap-3">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg group hover:bg-white/[0.08] transition-all">
            <span className="text-2xl sm:text-4xl font-bold text-white mb-1">
              <NumberCounter value={turnout.totalInSystem} />
            </span>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">In System</span>
            <span className="text-[9px] text-slate-600 mt-1">Imported phones</span>
          </div>

          <div className="bg-brand-500/5 backdrop-blur-md border border-brand-500/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg group hover:bg-brand-500/10 transition-all">
            <span className="text-2xl sm:text-4xl font-bold text-white mb-1">
              <NumberCounter value={turnout.total} />
            </span>
            <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">Registered</span>
            <span className="text-[9px] text-slate-600 mt-1">Verified emails</span>
          </div>

          <div className="bg-success-500/5 backdrop-blur-md border border-success-500/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg group hover:bg-success-500/10 transition-all">
            <span className="text-2xl sm:text-4xl font-bold text-white mb-1">
              <NumberCounter value={turnout.voted} />
            </span>
            <span className="text-[10px] font-black text-success-400 uppercase tracking-widest">Votes Cast</span>
            <span className="text-[9px] text-slate-600 mt-1">{turnout.percentage}% turnout</span>
          </div>
        </div>
      </div>

      <div className="mb-6 sm:mb-12">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 sm:p-6 rounded-2xl flex flex-col justify-between shadow-2xl">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-base sm:text-xl font-bold text-white mb-1">
                Live Feed Status
              </h3>
              <p className="text-slate-400 text-xs sm:text-sm">
                Data updates automatically as votes are recorded.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-300">
                Live Updates
              </span>
              <div
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${liveEnabled ? "bg-brand-600" : "bg-slate-700"}`}
                onClick={() => setLiveEnabled(!liveEnabled)}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${liveEnabled ? "translate-x-5" : "translate-x-0"}`}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-4 sm:mt-8">
            <div className="p-3 sm:p-4 bg-white/5 rounded-xl border border-white/5">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                Remaining Reg.
              </p>
              <p className="text-base sm:text-xl font-bold text-white">
                {turnout.total - turnout.voted}
              </p>
            </div>
            <div className="p-3 sm:p-4 bg-white/5 rounded-xl border border-white/5">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                Positions
              </p>
              <p className="text-base sm:text-xl font-bold text-white">
                {positions.length}
              </p>
            </div>
            <div className="p-3 sm:p-4 bg-white/5 rounded-xl border border-white/5">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                Candidates
              </p>
              <p className="text-base sm:text-xl font-bold text-white">
                {positions.reduce((acc, p) => acc + p.candidates.length, 0)}
              </p>
            </div>
            <div className="p-3 sm:p-4 bg-white/5 rounded-xl border border-white/5">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                Quorum
              </p>
              <p
                className={`text-base sm:text-xl font-bold ${turnout.percentage >= 50 ? "text-accent-500" : "text-slate-400"}`}
              >
                {turnout.percentage >= 50 ? "MET" : "PENDING"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Results Bento Grid */}
      {!showCandidateResults && (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 text-center mb-4">
          <p className="text-sm sm:text-base text-slate-300">
            Candidate-level vote counts are hidden while polls are open. Only
            turnout statistics are visible in real time.
          </p>
        </div>
      )}

      {showCandidateResults && (
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {positions.map((position) => (
            <div
              key={position.id}
              className="group/card bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl transition-all duration-500 hover:border-brand-500/30 hover:bg-white/[0.07]"
            >
              <div className="p-5 md:p-6 border-b border-white/5 bg-gradient-to-br from-white/5 to-transparent relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl group-hover/card:bg-brand-500/10 transition-colors" />
                <h2 className="text-lg md:text-xl font-black text-white tracking-tight">
                  {position.title}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
                  <p className="text-[9px] md:text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
                    {position.totalVotes} Total Cast
                  </p>
                </div>
              </div>

              <div className="p-4 md:p-6 space-y-5 flex-grow">
                {position.candidates.map((candidate, idx) => (
                  <div
                    key={candidate.id}
                    className="relative space-y-3 group/item"
                  >
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="relative shrink-0">
                        <div
                          className={`absolute inset-0 bg-brand-500/20 blur-lg rounded-full opacity-0 transition-opacity duration-500 ${idx === 0 ? "opacity-40" : ""}`}
                        />
                        <div
                          className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl overflow-hidden bg-slate-800 border-2 transition-transform duration-500 group-hover/item:scale-105 ${
                            idx === 0
                              ? "border-brand-500 shadow-[0_0_15px_rgba(163,42,41,0.3)]"
                              : "border-white/10"
                          }`}
                        >
                          <Image
                            src={
                              candidate?.photoUrl || "/placeholder-avatar.png"
                            }
                            alt={candidate?.name || "Candidate"}
                            className="w-full h-full object-cover"
                            width={64}
                            height={64}
                            unoptimized={!!candidate?.photoUrl}
                          />
                        </div>
                        {idx === 0 && (
                          <div className="absolute -top-1.5 -right-1.5 bg-brand-600 text-[8px] font-black px-1.5 py-0.5 rounded-full text-white border border-white/20 shadow-lg">
                            LEADER
                          </div>
                        )}
                      </div>

                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-end mb-1.5">
                          <span className="font-black text-white text-xs md:text-sm truncate pr-2 tracking-tight group-hover/item:text-brand-400 transition-colors">
                            {candidate.name.split(" ")[0]}{" "}
                            {candidate.name.split(" ")[1]?.[0]}.
                          </span>
                          <div className="text-right shrink-0">
                            <span className="text-brand-400 font-black text-sm md:text-base block leading-none">
                              <NumberCounter value={candidate.votes} />
                            </span>
                            <span className="text-[7px] md:text-[8px] text-slate-500 font-bold uppercase tracking-tighter">
                              Votes
                            </span>
                          </div>
                        </div>

                        <div className={`h-1.5 md:h-2 w-full bg-white/5 rounded-full overflow-hidden ${justUpdated ? "animate-brief-scale" : ""}`}>
                          <div
                            className={`h-full bg-gradient-to-r from-brand-700 to-brand-500 transition-all duration-1000 ease-out relative ${
                              idx === 0
                                ? "after:absolute after:inset-0 after:bg-white/20 after:animate-shimmer"
                                : ""
                            }`}
                            style={{
                              width: `${Math.max(candidate.percentage, 1)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-5 py-3 md:px-6 md:py-4 bg-white/2 border-t border-white/5 flex justify-between items-center">
                <span className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  Live Updates Active
                </span>
                <div className="flex -space-x-2">
                  {position.candidates.slice(0, 3).map((c, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 md:w-5 md:h-5 rounded-full border border-surface-950 overflow-hidden bg-slate-800"
                    >
                      <Image
                        src={c?.photoUrl || "/placeholder-avatar.png"}
                        alt=""
                        className="w-full h-full object-cover opacity-50"
                        width={20}
                        height={20}
                        unoptimized={!!c?.photoUrl}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
