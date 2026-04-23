import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { serverError } from '@/lib/response';

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const votes = await prisma.vote.findMany({
      include: {
        voter: true,
        candidate: true,
      },
      orderBy: { castAt: 'desc' },
    });

    // Create CSV header
    let csv = 'Voter Phone,Position,Candidate Name,Candidate PF,Cast At\n';

    // Add rows
    votes.forEach((v) => {
      const row = [
        v.voter.phone,
        `"${v.position}"`,
        `"${v.candidate.name}"`,
        `"${v.candidate.scholarCode}"`,
        v.castAt.toISOString(),
      ];
      csv += row.join(',') + '\n';
    });

    const filename = `elp_votes_export_${new Date().toISOString().split('T')[0]}.csv`;

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
