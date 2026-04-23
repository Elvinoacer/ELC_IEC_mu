import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import VoterShell from '@/components/layouts/VoterShell';
import BallotWizard from '@/components/voter/BallotWizard';
import { verifyVoterToken } from '@/lib/jwt';

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

  const positions = await prisma.position.findMany({
    orderBy: { displayOrder: 'asc' },
    include: {
      candidates: {
        where: { status: 'APPROVED' },
        orderBy: { name: 'asc' },
      },
    },
  });

  return (
    <VoterShell step="vote">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Official Ballot</h1>
          <p className="mt-1 text-sm text-slate-400">Vote position-by-position, then review before final submission.</p>
        </div>

        <BallotWizard positions={positions} deviceHash={voter.deviceHash ?? ''} />
      </div>
    </VoterShell>
  );
}
