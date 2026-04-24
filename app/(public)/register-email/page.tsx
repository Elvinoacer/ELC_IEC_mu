import PublicShell from '@/components/layouts/PublicShell';
import EmailRegistrationCard from '@/components/voter/EmailRegistrationCard';

export const metadata = {
  title: 'Register Your Email — ELP Moi Chapter Elections',
  description: 'Link your email address to your voter account to receive OTPs on election day.',
};

export default function RegisterEmailPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-lg px-4 py-10 sm:py-16 lg:py-24">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-accent-500/10 px-3 py-1 rounded-full border border-accent-500/20 mb-4">
            <svg className="w-4 h-4 text-accent-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <span className="text-xs font-bold uppercase tracking-widest text-accent-400">Email Registration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Connect Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-accent-400">Email</span>
          </h1>
          <p className="mt-3 text-sm text-slate-400 max-w-md mx-auto">
            Register your email address before election day. On voting day, your secure OTP will be delivered to your verified email.
          </p>
        </div>

        <div className="fade-in">
          <EmailRegistrationCard />
        </div>
      </div>
    </PublicShell>
  );
}
