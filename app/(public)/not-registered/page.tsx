import PublicShell from '@/components/layouts/PublicShell';

export const metadata = { title: 'Not Registered — ELP Moi Chapter' };

export default function NotRegisteredPage() {
  return (
    <PublicShell>
      <div className="w-full max-w-md text-center fade-in">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-error-500/10 border border-error-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-error-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3 font-[family-name:var(--font-outfit)]">
          Not Registered
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          This phone number is not registered in the ELP voter registry. 
          Please contact the IEC if you believe this is an error.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Home
        </a>
      </div>
    </PublicShell>
  );
}
