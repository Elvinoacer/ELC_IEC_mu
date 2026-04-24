import prisma from '@/lib/prisma';
import PublicShell from '@/components/layouts/PublicShell';
import CandidateRegistrationForm from '@/components/public/CandidateRegistrationForm';
import Countdown from '@/components/ui/Countdown';
import { getElectionPhase } from '@/lib/phases';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Candidate Registration - ELP Moi Chapter',
};

export default async function RegisterCandidatePage() {
  const config = await prisma.votingConfig.findUnique({ where: { id: 1 } });
  const phaseInfo = config ? getElectionPhase(config) : null;
  
  const positions = await prisma.position.findMany({
    orderBy: { displayOrder: 'asc' },
  });

  const isRegistrationOpen = phaseInfo?.phase === 'REGISTRATION_OPEN';

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

        {!isRegistrationOpen ? (
          <div className="fade-in max-w-2xl mx-auto p-12 rounded-[2.5rem] bg-white/5 border border-white/10 text-center space-y-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-500/5 to-transparent pointer-events-none" />
            
            <div className="w-20 h-20 bg-accent-500/10 rounded-3xl flex items-center justify-center mx-auto text-accent-500 relative z-10">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>

            <div className="space-y-4 relative z-10">
              <h2 className="text-3xl font-black text-white tracking-tight">Registration is {phaseInfo?.phase === 'UPCOMING_REGISTRATION' ? 'Pending' : 'Closed'}</h2>
              <p className="text-slate-400 leading-relaxed font-medium">
                {phaseInfo?.phase === 'UPCOMING_REGISTRATION' 
                  ? "The application window hasn't opened yet. Prepare your materials and check back once the countdown ends."
                  : "The candidate registration window for this election cycle has officially closed. If you believe this is an error, please contact the IEC."}
              </p>
            </div>

            {phaseInfo?.targetDate && (
              <div className="relative z-10">
                <Countdown targetDate={phaseInfo.targetDate} label="Time until registration opens" />
              </div>
            )}

            <div className="pt-4 relative z-10">
              <Link href="/">
                <Button variant="outline" className="px-8 border-white/10 hover:bg-white/5">Return to Home</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="relative fade-in">
            {/* Decorative background glow for the form */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-brand-600/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-accent-600/10 rounded-full blur-[100px] pointer-events-none" />
            
            <CandidateRegistrationForm positions={positions} />
          </div>
        )}
      </div>
    </PublicShell>
  );
}
