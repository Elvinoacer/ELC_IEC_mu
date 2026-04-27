"use client";

import React, { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import Card from "@/components/ui/Card";
import NumberCounter from "@/components/ui/NumberCounter";

interface ResultsPayload {
  positions: Array<{
    id: number;
    title: string;
    displayOrder: number;
    totalVotes: number;
    candidates: Array<{
      id: number;
      name: string;
      photoUrl: string;
      school: string;
      yearOfStudy: string;
      votes: number;
      percentage: number;
    }>;
  }>;
  turnout: { voted: number; total: number; percentage: number };
  isOpen: boolean;
  showCandidateResults: boolean;
  closesAt: string | null;
}

export default function ResultsPanel({
  initialData,
  compact = false,
}: {
  initialData: ResultsPayload | null;
  compact?: boolean;
}) {
  const [data, setData] = useState<ResultsPayload | null>(initialData);
  const [connected, setConnected] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [justUpdated, setJustUpdated] = useState(false);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    const isProd = process.env.NODE_ENV === "production";

    let socket: Socket | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (pollInterval) return;
      console.log(
        "[POLLING] Socket offline or misconfigured, starting fallback polling...",
      );
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

    if (isProd && !socketUrl) {
      console.error(
        "CRITICAL: NEXT_PUBLIC_SOCKET_URL is not defined in production.",
      );
      setSocketError("Live feed URL missing. Using automatic refresh...");
      startPolling();
      return () => stopPolling();
    }

    const timer = setTimeout(() => {
      socket = io(socketUrl || "http://localhost:3001/results", {
        transports: ["websocket", "polling"],
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      });

      socket.on("connect", () => {
        setConnected(true);
        setSocketError("Reconnected! Refreshing data...");
        setTimeout(() => setSocketError(null), 3000);
        stopPolling();
      });

      socket.on("connect_error", (err) => {
        console.error("Socket connection error:", err);
        setConnected(false);
        setSocketError("Reconnecting to live feed...");
        startPolling();
      });

      socket.on("disconnect", () => {
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
  }, []);

  const positions = useMemo(() => data?.positions ?? [], [data]);
  const showCandidateResults = data?.showCandidateResults ?? true;

  return (
    <Card
      padding="lg"
      className={`h-full border-white/15 bg-gradient-to-br from-surface-800/80 via-surface-900/75 to-surface-900/70 backdrop-blur-xl shadow-[0_24px_60px_rgba(2,6,23,0.55)] p-3 sm:p-6 transition-all duration-500 ${justUpdated ? "ring-2 ring-brand-500/50 shadow-[0_0_30px_rgba(163,42,41,0.3)] scale-[1.01]" : ""}`}
    >
      <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <h3 className="text-sm sm:text-lg font-bold text-white">
            Live Results
          </h3>
          <span className="text-[10px] text-slate-500 font-medium italic">
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${connected ? "bg-success-500/10 text-success-300" : "bg-slate-500/10 text-slate-400"}`}
          >
            {connected ? "🟢 Live" : "⚪ Offline"}
          </span>
          {socketError && (
            <span className="text-[10px] text-amber-400 mt-1 font-medium animate-pulse">
              {socketError}
            </span>
          )}
        </div>
      </div>

      {data && (
        <div className="mb-3 sm:mb-4 text-xs sm:text-sm text-slate-300">
          Turnout{" "}
          <span className="font-semibold text-white">
            {data.turnout.percentage}%
          </span>{" "}
          ({data.turnout.voted}/{data.turnout.total})
        </div>
      )}

      {!showCandidateResults && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs sm:text-sm text-slate-300">
          Candidate-level tallies are hidden while polls are open. Turnout
          remains visible in real time.
        </div>
      )}

      {showCandidateResults && (
        <>
          {positions.map((position, pIdx) => {
            const candidates = compact
              ? position.candidates.slice(0, 3)
              : position.candidates;
            return (
              <div key={position.id} className="relative group">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-500 group-hover:text-brand-400 transition-colors">
                    {position.title}
                  </h4>
                  <span className="text-[10px] font-bold text-slate-600 bg-white/5 px-2 py-0.5 rounded-full">
                    {position.totalVotes} Total
                  </span>
                </div>

                <div
                  className={`${compact ? "grid grid-cols-1 min-[430px]:grid-cols-2 gap-2 sm:gap-3" : "space-y-4"}`}
                >
                  {candidates.map((c, idx) => (
                    <div key={c.id} className="relative">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="relative">
                          <div
                            className={`absolute -inset-1 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity ${idx === 0 ? "bg-brand-500/20" : "bg-slate-500/10"}`}
                          ></div>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={c.photoUrl || "/placeholder-avatar.png"}
                            alt={c.name}
                            className={`relative w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 ${idx === 0 ? "border-brand-500/50" : "border-white/10"}`}
                          />
                          {idx === 0 && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-600 rounded-full flex items-center justify-center border border-surface-900 shadow-lg">
                              <svg
                                className="w-2.5 h-2.5 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-end mb-1.5">
                            <div>
                              <p
                                className={`text-xs sm:text-sm font-bold truncate ${idx === 0 ? "text-white" : "text-slate-200"}`}
                              >
                                {c.name}
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium">
                                {c.school}
                              </p>
                            </div>
                            <div className="text-right">
                              <span
                                className={`text-xs font-black ${idx === 0 ? "text-brand-400" : "text-slate-400"}`}
                              >
                                <NumberCounter value={c.percentage} />%
                              </span>
                              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">
                                <NumberCounter value={c.votes} /> Votes
                              </p>
                            </div>
                          </div>
                          <div className={`h-1.5 w-full bg-white/5 rounded-full overflow-hidden ${justUpdated ? "animate-brief-scale" : ""}`}>
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                idx === 0
                                  ? "bg-gradient-to-r from-brand-600 to-brand-400 shadow-[0_0_8px_rgba(163,42,41,0.4)]"
                                  : "bg-slate-600"
                              }`}
                              style={{ width: `${Math.max(c.percentage, 2)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {pIdx < positions.length - 1 && (
                  <div className="mt-6 border-b border-white/5" />
                )}
              </div>
            );
          })}
        </>
      )}
    </Card>
  );
}
