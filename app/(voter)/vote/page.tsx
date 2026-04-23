import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import VoterShell from '@/components/layouts/VoterShell';
import BallotForm from '@/components/voter/BallotForm';
import { verifyVoterToken } from '@/lib/jwt';

export const metadata = {
  title: 'Official Ballot - ELP Moi Chapter',
};

export default async function VotePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('vote_session')?.value;

  if (!token) {
    redirect('/');
  }

  // Double check voter hasn't already voted (if they bookmarked the page)
  const payload = await verifyVoterToken(token);
  if (!payload || !payload.id) {
    redirect('/');
  }
  
  const voter = await prisma.voter.findUnique({ where: { id: payload.id as number } });
  if (!voter || voter.hasVoted) {
    redirect('/results');
  }

  // Fetch all positions and APPROVED candidates
  const dbPositions = await prisma.position.findMany({
    orderBy: { displayOrder: 'asc' },
    include: {
      candidates: {
        where: { status: 'APPROVED' },
        orderBy: { name: 'asc' },
      }
    }
  });

  // Filter out positions with no candidates
  const activePositions = dbPositions.filter(p => p.candidates.length > 0);

  // Pass device hash string down for submission
  const deviceHash = voter.deviceHash || '';

  return (
    <VoterShell step="vote">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 font-[family-name:var(--font-outfit)]">
            Official Ballot
          </h1>
          <p className="text-slate-300 text-sm">
            Please select ONE candidate per position. You must cast a vote for every position.
          </p>
        </div>

        {activePositions.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            No approved candidates found. The ballot is empty.
          </div>
        ) : (
          <BallotForm positions={activePositions} deviceHash={deviceHash} />
        )}
      </div>
    </VoterShell>
  );
}
