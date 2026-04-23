import prisma from '@/lib/prisma';
import PublicShell from '@/components/layouts/PublicShell';
import CandidateRegistrationForm from '@/components/public/CandidateRegistrationForm';

export const metadata = {
  title: 'Candidate Registration - ELP Moi Chapter',
};

export default async function RegisterCandidatePage() {
  const positions = await prisma.position.findMany({
    orderBy: { displayOrder: 'asc' },
  });

  return (
    <PublicShell>
      <div className="w-full max-w-4xl mx-auto py-12 px-4 sm:px-6">
        {/* Premium Hero Section */}
        <section className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 mb-4">
            <span className="flex h-2 w-2 rounded-full bg-accent-500 animate-pulse"></span>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-400">Candidate Portal</p>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 font-[family-name:var(--font-outfit)] tracking-tight">
            Run for <span className="text-brand-500">Office</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto font-medium">
            Join the leadership of the Equity Leaders Program Moi Chapter. Submit your application below to appear on the official ballot.
          </p>
        </section>

        <div className="relative">
          {/* Decorative background glow for the form */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-brand-600/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-accent-600/10 rounded-full blur-[100px] pointer-events-none" />
          
          <CandidateRegistrationForm positions={positions} />
        </div>
      </div>
    </PublicShell>
  );
}
