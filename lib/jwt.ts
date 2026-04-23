/**
 * JWT Helpers
 *
 * Two separate token types:
 *  - Voter tokens:  short-lived (15 min), signed with JWT_SECRET
 *  - Admin tokens:  longer-lived (1 hr), signed with ADMIN_JWT_SECRET
 *
 * Tokens are stored in httpOnly cookies — never exposed to client JS.
 */

import { serialize, parse } from "cookie";
import type { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";

// ─── Environment ──────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || "dev-voter-secret-change-me";
const JWT_TTL = Number(process.env.JWT_TTL || 900); // 15 minutes

const ADMIN_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET || "dev-admin-secret-change-me";
const ADMIN_JWT_TTL = Number(process.env.ADMIN_JWT_TTL || 3600); // 1 hour

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// ─── Token Payloads ───────────────────────────────────────────────────────────

export interface VoterTokenPayload {
  id: number;
  phone: string;
  type: "voter";
}

export interface AdminTokenPayload {
  adminId: number;
  role: string;
  type: "admin";
}

// ─── Voter Tokens ─────────────────────────────────────────────────────────────

export async function signVoterToken(
  phone: string,
  id: number,
): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({ phone, id, type: "voter" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${JWT_TTL}s`)
    .sign(secret);
}

export async function verifyVoterToken(
  token: string,
): Promise<VoterTokenPayload | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== "voter") return null;
    return {
      id: payload.id as number,
      phone: payload.phone as string,
      type: "voter",
    };
  } catch {
    return null;
  }
}

export async function signCandidateRegToken(phone: string): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({ phone, type: "candidate_reg" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h") // 1 hour to complete registration
    .sign(secret);
}

export async function verifyCandidateRegToken(
  token: string,
): Promise<{ phone: string } | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== "candidate_reg") return null;
    return { phone: payload.phone as string };
  } catch {
    return null;
  }
}

// ─── Admin Tokens ─────────────────────────────────────────────────────────────

export async function signAdminToken(
  adminId: number,
  role: string,
): Promise<string> {
  const secret = new TextEncoder().encode(ADMIN_JWT_SECRET);
  return new SignJWT({ adminId, role, type: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_JWT_TTL}s`)
    .sign(secret);
}

export async function verifyAdminToken(
  token: string,
): Promise<AdminTokenPayload | null> {
  try {
    const secret = new TextEncoder().encode(ADMIN_JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== "admin") return null;
    return {
      adminId: payload.adminId as number,
      role: payload.role as string,
      type: "admin",
    };
  } catch {
    return null;
  }
}

// ─── Cookie Helpers ───────────────────────────────────────────────────────────

const VOTER_COOKIE_NAME = "vote_session";
const ADMIN_COOKIE_NAME = "admin_session";

function makeCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}

/**
 * Create a Set-Cookie header string for a voter session.
 */
export function setVoterCookie(token: string): string {
  return serialize(VOTER_COOKIE_NAME, token, makeCookieOptions(JWT_TTL));
}

/**
 * Create a Set-Cookie header string for an admin session.
 */
export function setAdminCookie(token: string): string {
  return serialize(ADMIN_COOKIE_NAME, token, makeCookieOptions(ADMIN_JWT_TTL));
}

/**
 * Create a Set-Cookie header string that clears a cookie.
 */
export function clearCookie(name: string): string {
  return serialize(name, "", { ...makeCookieOptions(0), maxAge: 0 });
}

export function clearVoterCookie(): string {
  return clearCookie(VOTER_COOKIE_NAME);
}

export function clearAdminCookie(): string {
  return clearCookie(ADMIN_COOKIE_NAME);
}

/**
 * Extract voter token from a NextRequest's cookies.
 */
export async function getVoterTokenFromRequest(
  req: NextRequest,
): Promise<VoterTokenPayload | null> {
  const token = req.cookies.get(VOTER_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyVoterToken(token);
}

/**
 * Extract admin token from a NextRequest's cookies.
 */
export async function getAdminTokenFromRequest(
  req: NextRequest,
): Promise<AdminTokenPayload | null> {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

/**
 * Parse cookies from a raw Cookie header string (for use in Express server).
 */
export function parseCookies(
  cookieHeader: string,
): Record<string, string | undefined> {
  return parse(cookieHeader || "");
}

// Export cookie names for reference
export { VOTER_COOKIE_NAME, ADMIN_COOKIE_NAME };
