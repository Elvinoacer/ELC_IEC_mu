import Image from 'next/image';

export default function ELPLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3.5 group ${className}`}>
      {/* Official Logo Container */}
      <div className="relative w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-md overflow-hidden group-hover:scale-105 transition-transform duration-500">
        <Image 
          src="/image.png" 
          alt="ELP Moi Chapter Logo" 
          fill
          className="object-contain p-1"
        />
      </div>

      <div className="hidden sm:block">
        <h1 className="text-lg font-bold text-white leading-tight tracking-tight font-[family-name:var(--font-outfit)]">
          ELP <span className="text-brand-400">Moi Chapter</span>
        </h1>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.25em]">
          Electoral Commission
        </p>
      </div>
    </div>
  );
}
