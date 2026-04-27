import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import VoterShell from '@/components/layouts/VoterShell';
import BallotWizard from '@/components/voter/BallotWizard';
import { verifyVoterToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Official Ballot - ELP Moi Chapter',
};

export default async function VotePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('vote_session')?.value;

  if (!token) redirect('/');

  const payload = await verifyVoterToken(token);
  if (!payload || !payload.id) redirect('/');

  const [voter, config] = await Promise.all([
    prisma.voter.findUnique({ where: { id: payload.id as number } }),
    prisma.votingConfig.findUnique({ where: { id: 1 } }),
  ]);

  if (!voter || voter.hasVoted) redirect('/results');

  if (config) {
    const now = new Date();
    const isOpen = !config.isManuallyClosed && now >= config.opensAt && now <= config.closesAt;
    if (!isOpen) redirect('/closed');
  }

  const rawPositions = await prisma.position.findMany({
    orderBy: { displayOrder: 'asc' },
    include: {
      candidates: {
        where: { status: 'APPROVED' },
        orderBy: { name: 'asc' },
      },
    },
  });

  // Filter out positions with no approved candidates
  const positions = rawPositions.filter(p => p.candidates.length > 0);

  return (
    <VoterShell step="vote">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-r from-surface-800/90 to-surface-900/70 p-6 shadow-xl">
          <p className="text-xs uppercase tracking-[0.24em] text-accent-300/80">Official Election Ballot</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Cast Your Final Vote</h1>
          <p className="mt-1 text-sm text-slate-300">Vote position-by-position, then review before final submission.</p>
        </div>

        <BallotWizard positions={positions} deviceHash={voter.deviceHash ?? ''} />
      </div>
    </VoterShell>
  );
}
