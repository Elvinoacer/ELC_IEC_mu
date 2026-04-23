import prisma from './prisma';

export interface CandidateResult {
  id: number;
  name: string;
  photoUrl: string;
  school: string;
  yearOfStudy: string;
  votes: number;
  percentage: number;
}

export interface PositionResult {
  id: number;
  title: string;
  displayOrder: number;
  candidates: CandidateResult[];
  totalVotes: number;
}

export interface TurnoutStats {
  voted: number;
  total: number;
  percentage: number;
}

export interface ResultsPayload {
  positions: PositionResult[];
  turnout: TurnoutStats;
  isOpen: boolean;
  closesAt: string | null;
}

export async function generateResultsPayload(): Promise<ResultsPayload> {
  const [total, voted, config, dbPositions] = await Promise.all([
    prisma.voter.count(),
    prisma.voter.count({ where: { hasVoted: true } }),
    prisma.votingConfig.findUnique({ where: { id: 1 } }),
    prisma.position.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        candidates: {
          where: { status: 'APPROVED' },
          orderBy: { votes: 'desc' },
        },
      },
    }),
  ]);

  const positions: PositionResult[] = dbPositions.map((pos) => {
    const totalVotes = pos.candidates.reduce((sum, c) => sum + c.votes, 0);
    return {
      id: pos.id,
      title: pos.title,
      displayOrder: pos.displayOrder,
      totalVotes,
      candidates: pos.candidates.map((c) => ({
        id: c.id,
        name: c.name,
        photoUrl: c.photoUrl,
        school: c.school,
        yearOfStudy: c.yearOfStudy,
        votes: c.votes,
        percentage: totalVotes > 0 ? Number(((c.votes / totalVotes) * 100).toFixed(1)) : 0,
      })),
    };
  });

  const now = new Date();
  const isOpen = !!config && !config.isManuallyClosed && now >= config.opensAt && now <= config.closesAt;

  return {
    positions,
    turnout: {
      voted,
      total,
      percentage: total > 0 ? Number(((voted / total) * 100).toFixed(1)) : 0,
    },
    isOpen,
    closesAt: config?.closesAt?.toISOString() ?? null,
  };
}
