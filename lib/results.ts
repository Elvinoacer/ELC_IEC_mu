import prisma from './prisma';

export interface CandidateResult {
  id: number;
  name: string;
  photoUrl: string;
  school: string;
  year: string;
  votes: number;
  percentage: number;
}

export interface PositionResult {
  position: string;
  candidates: CandidateResult[];
  total_votes_for_position: number;
}

export interface GlobalStats {
  total_eligible: number;
  total_cast: number;
  remaining: number;
  turnout_percentage: number;
}

export interface ResultsPayload {
  positions: PositionResult[];
  global: GlobalStats;
}

export async function generateResultsPayload(): Promise<ResultsPayload> {
  // 1. Get Global Stats
  const [totalEligible, totalCast] = await Promise.all([
    prisma.voter.count(),
    prisma.voter.count({ where: { hasVoted: true } }),
  ]);

  const remaining = totalEligible - totalCast;
  const turnout_percentage = totalEligible > 0 ? (totalCast / totalEligible) * 100 : 0;

  // 2. Get Positions and Candidates
  const dbPositions = await prisma.position.findMany({
    orderBy: { displayOrder: 'asc' },
    include: {
      candidates: {
        where: { status: 'APPROVED' },
        orderBy: { votes: 'desc' },
      }
    }
  });

  const positions: PositionResult[] = dbPositions.map(pos => {
    // Total votes cast for this position (sum of all candidate votes)
    const total_votes_for_position = pos.candidates.reduce((sum, c) => sum + c.votes, 0);

    const candidates: CandidateResult[] = pos.candidates.map(c => ({
      id: c.id,
      name: c.name,
      photoUrl: c.photoUrl,
      school: c.school,
      year: c.yearOfStudy,
      votes: c.votes,
      percentage: total_votes_for_position > 0 ? (c.votes / total_votes_for_position) * 100 : 0,
    }));

    return {
      position: pos.title,
      candidates,
      total_votes_for_position,
    };
  });

  return {
    positions,
    global: {
      total_eligible: totalEligible,
      total_cast: totalCast,
      remaining,
      turnout_percentage: Number(turnout_percentage.toFixed(1)),
    }
  };
}
