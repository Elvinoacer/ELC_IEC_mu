/**
 * API Response & Error Helpers
 *
 * Standardized JSON response format for all API routes.
 *
 * Success: { ok: true, data: ... }
 * Error:   { ok: false, error: "message", code?: "ERROR_CODE" }
 */

import { NextResponse } from "next/server";

// ─── Response Types ───────────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  ok: true;
  data: T;
  meta?: any;
}

export interface ApiError {
  ok: false;
  error: string;
  code?: string;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ─── Success Responses ────────────────────────────────────────────────────────

export function success<T>(
  data: T,
  status = 200,
  meta?: any,
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    {
      ok: true,
      data,
      ...(meta && { meta }),
    } as ApiSuccess<T>,
    { status },
  );
}

export function created<T>(data: T): NextResponse<ApiSuccess<T>> {
  return success(data, 201);
}

// ─── Error Responses ──────────────────────────────────────────────────────────

export function error(
  message: string,
  status = 400,
  code?: string,
): NextResponse<ApiError> {
  return NextResponse.json(
    { ok: false, error: message, ...(code && { code }) } as ApiError,
    { status },
  );
}

export function unauthorized(
  message = "Authentication required",
): NextResponse<ApiError> {
  return error(message, 401, "UNAUTHORIZED");
}

export function forbidden(message = "Access denied"): NextResponse<ApiError> {
  return error(message, 403, "FORBIDDEN");
}

export function notFound(
  message = "Resource not found",
): NextResponse<ApiError> {
  return error(message, 404, "NOT_FOUND");
}

export function conflict(message: string): NextResponse<ApiError> {
  return error(message, 409, "CONFLICT");
}

export function rateLimited(
  message = "Too many requests. Please try again later.",
): NextResponse<ApiError> {
  return error(message, 429, "RATE_LIMITED");
}

export function serverError(err?: unknown): NextResponse<ApiError> {
  // Log the actual error server-side, but never expose internals to clients
  if (err) {
    console.error("[API Error]", err instanceof Error ? err.message : err);
    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    }
  }
  return error(
    "An internal server error occurred. Please try again.",
    500,
    "INTERNAL_ERROR",
  );
}

export function validationError(message: string): NextResponse<ApiError> {
  return error(message, 422, "VALIDATION_ERROR");
}

// ─── Validation Helper ───────────────────────────────────────────────────────

/**
 * Parse and validate a request body using a Zod schema.
 * Returns the parsed data or throws with a validation error response.
 */
import { z } from "zod";

export async function parseBody<T extends z.ZodSchema>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw validationError("Invalid JSON in request body");
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.issues[0];
    const field = firstError.path.join(".");
    const message = field
      ? `${field}: ${firstError.message}`
      : firstError.message;
    throw validationError(message);
  }

  return result.data;
}
