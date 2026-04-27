import { NextRequest } from 'next/server';
import prisma from './prisma';

/**
 * Log an administrative action to the AuditLog table.
 */
export async function logAudit(
  req: Request | NextRequest,
  adminId: number | null,
  action: string,
  entity: string,
  entityId?: string | number,
  details?: Record<string, unknown>
) {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const ipAddress = (forwarded ? forwarded.split(',')[0].trim() : null) || req.headers.get('x-real-ip') || (req as { ip?: string }).ip || null;
    const userAgent = req.headers.get('user-agent') || null;

    await prisma.auditLog.create({
      data: {
        adminId,
        action,
        entity,
        entityId: entityId?.toString() || null,
        details: (details as any) || {},
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
  status: 'SUCCESS' | 'FAILED' | 'DUPLICATE' | 'OUTSIDE_WINDOW' | 'DEVICE_MISMATCH',
  data: {
    voterId?: number;
    phone?: string;
    reason?: string;
    deviceHash?: string;
  }
) {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const ipAddress = (forwarded ? forwarded.split(',')[0].trim() : null) || req.headers.get('x-real-ip') || null;

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
