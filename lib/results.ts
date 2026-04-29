import prisma from "./prisma";

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
  total: number;          // registered (eligible) voters
  totalInSystem: number;  // all phone numbers imported
  percentage: number;
}

export interface ResultsPayload {
  positions: PositionResult[];
  turnout: TurnoutStats;
  isOpen: boolean;
  showCandidateResults: boolean;
  closesAt: string | null;
}

export async function generateResultsPayload(options?: {
  includeCandidateResults?: boolean;
}): Promise<ResultsPayload> {
  const [totalInSystem, totalRegistered, totalVoted, config, dbPositions] = await Promise.all([
    prisma.voter.count(),
    prisma.voter.count({ where: { emailVerified: true } }),
    prisma.voter.count({ where: { hasVoted: true } }),
    prisma.votingConfig.findFirst({
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    }),
    prisma.position.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        candidates: {
          where: { status: "APPROVED" },
          include: {
            _count: {
              select: { voteRecords: true },
            },
          },
        },
      },
    }),
  ]);

  const now = new Date();
  const isOpen =
    !!config &&
    !config.isManuallyClosed &&
    now >= config.opensAt &&
    now <= config.closesAt;
  const showCandidateResults = options?.includeCandidateResults ?? !isOpen;

  const positions: PositionResult[] = dbPositions.map((pos) => {
    // Map db candidates to include the count as 'votes'
    const candidatesWithVotes = pos.candidates.map((c) => ({
      ...c,
      votes: c._count.voteRecords,
    }));

    // Sort by votes descending, then name ascending
    const orderedCandidates = candidatesWithVotes.sort((a, b) => {
      if (showCandidateResults) {
        if (b.votes !== a.votes) return b.votes - a.votes;
      }
      return a.name.localeCompare(b.name);
    });

    const totalVotes = showCandidateResults
      ? orderedCandidates.reduce((sum, c) => sum + c.votes, 0)
      : 0;

    return {
      id: pos.id,
      title: pos.title,
      displayOrder: pos.displayOrder,
      totalVotes,
      candidates: orderedCandidates.map((c) => ({
        id: c.id,
        name: c.name,
        photoUrl: c.photoUrl,
        school: c.school,
        yearOfStudy: c.yearOfStudy,
        votes: showCandidateResults ? c.votes : 0,
        percentage:
          showCandidateResults && totalVotes > 0
            ? Number(((c.votes / totalVotes) * 100).toFixed(1))
            : 0,
      })),
    };
  });

  return {
    positions,
    turnout: {
      voted: totalVoted,
      total: totalRegistered, // Denominator is registered voters
      totalInSystem,
      percentage: totalRegistered > 0 ? Number(((totalVoted / totalRegistered) * 100).toFixed(1)) : 0,
    },
    isOpen,
    showCandidateResults,
    closesAt: config?.closesAt?.toISOString() ?? null,
  };
}
