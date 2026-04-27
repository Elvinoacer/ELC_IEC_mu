import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_WINDOW_MINUTES = 15;

export async function checkLoginLockout(ip: string, username: string) {
  const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000);

  // Check failed attempts for this IP
  const ipFailures = await prisma.auditLog.count({
    where: {
      action: "ADMIN_LOGIN_FAILED",
      ipAddress: ip,
      createdAt: { gt: windowStart },
    },
  });

  if (ipFailures >= LOCKOUT_THRESHOLD) {
    return {
      locked: true,
      reason: `Too many failed attempts from this IP. Please try again in ${LOCKOUT_WINDOW_MINUTES} minutes.`,
    };
  }

  // Check failed attempts for this username
  const userFailures = await prisma.auditLog.count({
    where: {
      action: "ADMIN_LOGIN_FAILED",
      details: {
        path: ["username"],
        equals: username,
      },
      createdAt: { gt: windowStart },
    },
  });

  if (userFailures >= LOCKOUT_THRESHOLD) {
    return {
      locked: true,
      reason: `Account locked due to multiple failed login attempts. Please try again in ${LOCKOUT_WINDOW_MINUTES} minutes.`,
    };
  }

  return { locked: false };
}

export async function logFailedLogin(req: Request, username: string, reason: string) {
  await logAudit(
    req,
    null,
    "ADMIN_LOGIN_FAILED",
    "Admin",
    undefined,
    { username, reason }
  );
}

export async function logSuccessfulLogin(req: Request, adminId: number, username: string) {
  await logAudit(
    req,
    adminId,
    "ADMIN_LOGIN_SUCCESS",
    "Admin",
    adminId,
    { username }
  );
}
