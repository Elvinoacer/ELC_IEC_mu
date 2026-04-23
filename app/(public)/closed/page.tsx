import PublicShell from '@/components/layouts/PublicShell';

export const metadata = { title: 'Voting Closed — ELP Moi Chapter' };

export default function ClosedPage() {
  return (
    <PublicShell>
      <div className="w-full max-w-md text-center fade-in">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-surface-700 flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3 font-[family-name:var(--font-outfit)]">
          Voting is Closed
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          The voting window is not currently active. Check back later or view the results.
        </p>
        <a
          href="/results"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600/15 text-brand-400 border border-brand-500/20 text-sm font-medium hover:bg-brand-600/25 transition-all"
        >
          View Results
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </a>
      </div>
    </PublicShell>
  );
}
