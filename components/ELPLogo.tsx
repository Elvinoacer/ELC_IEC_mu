import Image from 'next/image';

export default function ELPLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 sm:gap-4 group ${className}`}>
      {/* Official Logo Container - Circular for brand alignment */}
      <div className="relative w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center bg-white rounded-full shadow-[0_4px_16px_rgba(255,255,255,0.15)] overflow-hidden group-hover:scale-105 group-hover:shadow-[0_0_24px_rgba(255,255,255,0.25)] transition-all duration-500 ring-1 ring-white/10">
        <Image 
          src="/image.png" 
          alt="ELP Moi Chapter Logo" 
          fill
          className="object-contain p-2 transition-transform duration-500 group-hover:scale-110"
        />
        {/* Subtle overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent pointer-events-none" />
      </div>

      <div className="hidden xs:flex flex-col">
        <h1 className="text-sm sm:text-base md:text-lg font-black text-white leading-none tracking-tight font-[family-name:var(--font-outfit)]">
          ELP <span className="text-brand-500">Moi Chapter</span>
        </h1>
        <p className="text-[8px] sm:text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-1 opacity-80">
          Electoral Commission
        </p>
      </div>
    </div>
  );
}
