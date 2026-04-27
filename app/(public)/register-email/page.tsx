import PublicShell from '@/components/layouts/PublicShell';
import EmailRegistrationCard from '@/components/voter/EmailRegistrationCard';
import prisma from '@/lib/prisma';
import { getElectionPhase } from '@/lib/phases';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export const metadata = {
  title: 'Register Your Email — ELP Moi Chapter Elections',
  description: 'Link your email address to your voter account to receive OTPs on election day.',
};

export default async function RegisterEmailPage() {
  const config = await prisma.votingConfig.findUnique({ where: { id: 1 } });
  const phaseInfo = getElectionPhase(config);
  const isOpen = phaseInfo.phase === 'REGISTRATION_OPEN';

  return (
    <PublicShell>
      <div className="mx-auto max-w-lg px-4 py-10 sm:py-16 lg:py-24">
        <div className="mb-8 text-center">
          <div className={`inline-flex items-center gap-2 ${isOpen ? 'bg-accent-500/10 border-accent-500/20 text-accent-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'} px-3 py-1 rounded-full border mb-4`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <span className="text-xs font-bold uppercase tracking-widest">{isOpen ? 'Registration Open' : 'Registration Closed'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Connect Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-accent-400">Email</span>
          </h1>
          <p className="mt-3 text-sm text-slate-400 max-w-md mx-auto">
            {isOpen 
              ? 'Register your email address before election day. On voting day, your secure OTP will be delivered to your verified email.'
              : 'The voter registration window is currently closed. Email registration is required before the polls open.'}
          </p>
        </div>

        <div className="fade-in">
          {isOpen ? (
            <EmailRegistrationCard />
          ) : (
            <div className="p-10 rounded-[2.5rem] bg-white/5 border border-white/10 text-center space-y-6">
              <div className="w-16 h-16 bg-slate-500/10 rounded-2xl flex items-center justify-center mx-auto text-slate-500">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2.25 2.25 0 002.25-2.25v-6a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25v6A2.25 2.25 0 006 21z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7V5a3 3 0 00-6 0v2h6z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Portal Inactive</h3>
                <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
                  You cannot link your email at this time. Please refer to the official election schedule on the home page.
                </p>
              </div>
              <Link href="/" className="block">
                <Button variant="outline" className="w-full border-white/10 hover:bg-white/5">
                  Return to Home
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </PublicShell>
  );
}
