import PublicShell from '@/components/layouts/PublicShell';
import Button from '@/components/ui/Button';

export default function HomePage() {
  return (
    <PublicShell>
      <div className="w-full max-w-md text-center fade-in">
        {/* Hero */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-600/10 border border-brand-500/20 mb-6">
            <div className="pulse-dot" />
            <span className="text-xs font-medium text-brand-400">
              Voting System Active
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 font-[family-name:var(--font-outfit)]">
            Cast Your <span className="text-gradient">Vote</span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Equity Leaders Program — Moi Chapter Elections.
            Enter your registered phone number to begin.
          </p>
        </div>

        {/* Phone input card */}
        <div className="glass-card p-6 sm:p-8 text-left">
          <label htmlFor="phone" className="block text-sm font-medium text-slate-300 mb-2">
            Phone Number
          </label>
          <div className="flex gap-3">
            <div className="flex items-center px-3 rounded-xl bg-surface-700 border border-glass-border text-slate-400 text-sm">
              +254
            </div>
            <input
              id="phone"
              type="tel"
              placeholder="712 345 678"
              className="flex-1 px-4 py-3 rounded-xl bg-surface-800 border border-glass-border text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all"
            />
          </div>
          <Button className="w-full mt-4" size="lg">
            Continue
          </Button>
          <p className="text-xs text-slate-500 mt-3 text-center">
            A verification code will be sent to your phone via SMS.
          </p>
        </div>
      </div>
    </PublicShell>
  );
}
