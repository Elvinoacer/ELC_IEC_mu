import { NextRequest } from 'next/server';
import prisma from './prisma';

/**
 * Log an administrative action to the AuditLog table.
 */
export async function logAudit(
  req: NextRequest,
  adminId: number,
  action: string,
  entity: string,
  entityId?: string | number,
  details?: any
) {
  try {
    const ipAddress = req.headers.get('x-forwarded-for') || (req as any).ip || null;
    const userAgent = req.headers.get('user-agent') || null;

    await prisma.auditLog.create({
      data: {
        adminId,
        action,
        entity,
        entityId: entityId?.toString() || null,
        details: details || {},
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    console.error('Failed to log audit:', err);
    // We don't throw here to avoid breaking the main operation if logging fails
  }
}

/**
 * Log a vote attempt to the VoteAttempt table.
 */
export async function logVoteAttempt(
  req: NextRequest,
  status: 'SUCCESS' | 'FAILED' | 'DUPLICATE' | 'OUTSIDE_WINDOW',
  data: {
    voterId?: number;
    phone?: string;
    reason?: string;
    deviceHash?: string;
  }
) {
  try {
    const ipAddress = req.headers.get('x-forwarded-for') || (req as any).ip || null;

    await prisma.voteAttempt.create({
      data: {
        voterId: data.voterId || null,
        phone: data.phone || null,
        status,
        reason: data.reason || null,
        ipAddress,
        deviceHash: data.deviceHash || null,
      },
    });
  } catch (err) {
    console.error('Failed to log vote attempt:', err);
  }
}
