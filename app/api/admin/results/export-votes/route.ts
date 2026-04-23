import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { serverError } from '@/lib/response';
import { requireAdminSession } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit';

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if ('response' in auth) return auth.response;

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
      // Mask phone number for privacy: +2547****1234
      const phone = v.voter.phone;
      const maskedPhone = phone.length > 8 
        ? `${phone.substring(0, 5)}****${phone.substring(phone.length - 4)}`
        : '****';

      const row = [
        maskedPhone,
        `"${v.position}"`,
        `"${v.candidate.name}"`,
        `"${v.candidate.scholarCode}"`,
        v.castAt.toISOString(),
      ];
      csv += row.join(',') + '\n';
    });

    await logAudit(
      req,
      auth.admin.id,
      'EXPORT_VOTES',
      'Vote',
      undefined,
      { count: votes.length }
    );

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
