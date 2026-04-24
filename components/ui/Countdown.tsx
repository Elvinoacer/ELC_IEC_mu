'use client';

import React, { useState, useEffect } from 'react';

interface CountdownProps {
  targetDate: Date;
  label: string;
  className?: string;
}

export default function Countdown({ targetDate, label, className = "" }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      
      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isExpired: false
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.isExpired) return null;

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{label}</p>
      <div className="flex gap-2 sm:gap-4">
        {[
          { label: 'Days', value: timeLeft.days },
          { label: 'Hrs', value: timeLeft.hours },
          { label: 'Min', value: timeLeft.minutes },
          { label: 'Sec', value: timeLeft.seconds },
        ].map((item, i) => (
          <div key={item.label} className="flex flex-col items-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden group">
              <span className="text-xl sm:text-2xl font-black text-white relative z-10">
                {String(item.value).padStart(2, '0')}
              </span>
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-[8px] uppercase font-bold text-slate-500 mt-1.5 tracking-wider">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
