import VoterShell from '@/components/layouts/VoterShell';
import Button from '@/components/ui/Button';

export const metadata = { title: 'Vote Confirmed — ELP Moi Chapter' };

export default function VoteConfirmedPage() {
  return (
    <VoterShell step="done">
      <div className="text-center fade-in">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success-500/15 border border-success-500/20 flex items-center justify-center">
          <svg className="w-10 h-10 text-success-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2 font-[family-name:var(--font-outfit)]">
          Vote <span className="text-gradient">Confirmed!</span>
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          Your vote has been recorded securely. Thank you for participating.
        </p>
        <a href="/results">
          <Button variant="outline">View Live Results</Button>
        </a>
      </div>
    </VoterShell>
  );
}
