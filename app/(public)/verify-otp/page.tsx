import PublicShell from '@/components/layouts/PublicShell';

export const metadata = { title: 'Verify OTP — ELP Moi Chapter' };

export default function VerifyOTPPage() {
  return (
    <PublicShell>
      <div className="w-full max-w-md text-center fade-in">
        <h1 className="text-2xl font-bold text-white mb-2 font-[family-name:var(--font-outfit)]">
          Enter Verification Code
        </h1>
        <p className="text-slate-400 text-sm mb-8">
          We sent a 6-digit code to your phone. Enter it below.
        </p>

        <div className="glass-card p-6 sm:p-8">
          {/* OTP input placeholder */}
          <div className="flex justify-center gap-3 mb-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="w-12 h-14 rounded-xl bg-surface-800 border border-glass-border flex items-center justify-center text-xl font-bold text-white"
              >
                &nbsp;
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Didn&apos;t receive the code?{' '}
            <button className="text-brand-400 hover:text-brand-300 transition-colors">
              Resend
            </button>
          </p>
        </div>
      </div>
    </PublicShell>
  );
}
