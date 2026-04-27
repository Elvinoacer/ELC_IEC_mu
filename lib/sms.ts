/**
 * @deprecated This module is deprecated. Use lib/email.ts (Resend) instead.
 * Retained for backward compatibility during the SMS→Email migration.
 * Do not add new usages of this module.
 *
 * Africa's Talking SMS Integration (DEPRECATED)
 * 
 * Key design decisions:
 * - Fail-fast: throws at import time if AT credentials are missing in production
 * - No senderId/from: we have no approved sender ID, so we never pass one
 * - Retry: 1 automatic retry with 2s backoff for transient network failures
 * - trySendSMS: non-throwing wrapper for non-critical SMS (confirmations)
 * - Sandbox mode: when AT_USERNAME=sandbox, logs to console + DB only
 */

import AfricasTalking from 'africastalking';
import prisma from './prisma';

// ── Environment Validation ──────────────────────────────────────────────────────

const AT_USERNAME = (process.env.AT_USERNAME || '').trim();
const AT_API_KEY = (process.env.AT_API_KEY || '').trim();
const AT_SENDER_ID = (process.env.AT_SENDER_ID || '').trim();

const IS_SANDBOX = !AT_USERNAME || AT_USERNAME.toLowerCase() === 'sandbox';

// Warn loudly at startup if credentials look wrong
if (IS_SANDBOX) {
  console.warn(
    '\n⚠️  [SMS] Running in SANDBOX mode — no real SMS will be sent.\n' +
    '   AT_USERNAME is missing or set to "sandbox".\n' +
    '   Set AT_USERNAME to your live Africa\'s Talking username for production.\n'
  );
}

if (!IS_SANDBOX && !AT_API_KEY) {
  console.error(
    '\n🚨 [SMS] CRITICAL: AT_USERNAME is set to a live account but AT_API_KEY is missing!\n' +
    '   SMS sending will fail for all requests.\n'
  );
}

if (AT_SENDER_ID) {
  console.warn(
    `\n⚠️  [SMS] AT_SENDER_ID is set to "${AT_SENDER_ID}".\n` +
    '   Unless this is an approved & mapped sender ID on your AT account,\n' +
    '   the gateway will reject messages with InvalidSenderId.\n' +
    '   Remove AT_SENDER_ID from your env if unsure.\n'
  );
}

// ── SDK Initialization ──────────────────────────────────────────────────────────

const at = AfricasTalking({
  apiKey: AT_API_KEY || 'sandbox_dummy_key',
  username: IS_SANDBOX ? 'sandbox' : AT_USERNAME,
});

const sms = at.SMS;

// ── Types ───────────────────────────────────────────────────────────────────────

interface ATRecipient {
  statusCode: number;
  number: string;
  status: string;
  cost: string;
  messageId: string;
}

interface ATSendResult {
  SMSMessageData: {
    Message: string;
    Recipients: ATRecipient[];
  };
}

// Africa's Talking status codes that mean "accepted for delivery"
const AT_SUCCESS_CODES = new Set([100, 101, 102]);
// 100 = Processed, 101 = Sent, 102 = Queued

// ── Core Send Function ──────────────────────────────────────────────────────────

/**
 * Send an SMS via Africa's Talking.
 * 
 * Throws on failure. Use `trySendSMS` for non-critical messages
 * where you don't want a failure to break the calling flow.
 */
export async function sendSMS(to: string, message: string): Promise<void> {
  // Always create a log record first for audit trail
  const log = await prisma.smsLog.create({
    data: {
      phone: to,
      message,
      status: 'PENDING',
    }
  });

  // ── Sandbox Mode ────────────────────────────────────────────────────────────
  if (IS_SANDBOX) {
    console.log(
      `\n📱 [SMS SANDBOX → ${to}]\n` +
      `   Message: ${message}\n` +
      `   (No real SMS sent — AT_USERNAME is sandbox)\n`
    );
    await prisma.smsLog.update({
      where: { id: log.id },
      data: { status: 'SIMULATED' }
    });
    return;
  }

  // ── Live Mode ───────────────────────────────────────────────────────────────
  if (!AT_API_KEY) {
    const errorMsg = 'AT_API_KEY is missing but AT_USERNAME is set to a live account. Cannot send SMS.';
    console.error(`[SMS] ${errorMsg}`);
    await prisma.smsLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', failureReason: errorMsg }
    });
    throw new Error(errorMsg);
  }

  // Build options — NEVER include senderId/from unless you have an approved one
  // Using Record<string, unknown> because the AT SDK type definitions require 'from' but it's actually optional
  const options: Record<string, unknown> = {
    to: [to],
    message,
    enqueue: true,
  };

  // Only add senderId if it's explicitly set and non-empty
  // WARNING: Using an unapproved senderId will cause gateway rejection
  if (AT_SENDER_ID) {
    options.senderId = AT_SENDER_ID;
  }

  // Attempt send with 1 retry for transient failures
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`[SMS] Retry attempt ${attempt} for ${to}...`);
        await sleep(2000); // 2s backoff before retry
      }

      console.log(`[SMS] Sending to ${to} (attempt ${attempt})...`);
      const result = (await sms.send(options) as unknown) as ATSendResult;

      // Log full raw response for debugging
      console.log('[SMS] AT raw response:', JSON.stringify(result, null, 2));

      // Parse recipient from response
      const recipient = extractRecipient(result);

      if (!recipient) {
        // AT accepted the request but returned no recipient info
        // This can happen — log it but don't hard-fail
        const msg = result?.SMSMessageData?.Message || 'Unknown';
        console.warn(`[SMS] No recipient in AT response. Message: ${msg}`);
        
        await prisma.smsLog.update({
          where: { id: log.id },
          data: {
            status: 'ACCEPTED',
            failureReason: `No recipient data. AT Message: ${msg}`,
          }
        });
        return; // Don't retry — AT accepted it
      }

      // Check status code
      const statusCode = Number(recipient.statusCode);
      const status = recipient.status || 'Unknown';
      const cost = recipient.cost || 'N/A';

      // Normalize messageId — AT returns literal "None" string on rejection
      const rawMessageId = recipient.messageId;
      const messageId = (rawMessageId && rawMessageId !== 'None' && rawMessageId !== 'none')
        ? rawMessageId
        : null;

      if (!AT_SUCCESS_CODES.has(statusCode)) {
        // AT explicitly rejected this message
        const rejectMsg = `AT rejected SMS: statusCode=${statusCode}, status=${status}, number=${recipient.number}, cost=${cost}`;
        console.error(`[SMS] ${rejectMsg}`);

        // Update DB log — but don't let a DB error mask the AT rejection
        try {
          await prisma.smsLog.update({
            where: { id: log.id },
            data: {
              messageId,
              status: 'REJECTED',
              failureReason: rejectMsg,
            }
          });
        } catch (dbErr) {
          console.error('[SMS] Failed to update smsLog for rejection:', dbErr);
        }

        // Don't retry on explicit rejection (wrong number, no balance, invalid sender, blacklist, etc.)
        throw new Error(rejectMsg);
      }

      // Success — AT accepted the message
      await prisma.smsLog.update({
        where: { id: log.id },
        data: {
          messageId,
          status: status.toUpperCase(),
        }
      });

      console.log(`[SMS] ✅ Sent to ${to}: status=${status}, id=${messageId ?? 'N/A'}, cost=${cost}`);
      return; // Success — exit the retry loop

    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      lastError = error;

      // Don't retry on explicit AT rejection (4xx-level errors)
      if (error.message.includes('AT rejected SMS')) {
        throw error;
      }

      // Don't retry on validation errors from the SDK
      if (error.message.includes('must be a valid phone number') ||
          error.message.includes('is required')) {
        await prisma.smsLog.update({
          where: { id: log.id },
          data: { status: 'FAILED', failureReason: `Validation: ${error.message}` }
        });
        throw error;
      }

      // Transient error (network, timeout) — retry if we have attempts left
      if (attempt < 2) {
        console.warn(`[SMS] Transient failure on attempt ${attempt}, will retry: ${error.message}`);
      }
    }
  }

  // Both attempts failed
  const failMsg = lastError?.message || 'Unknown error after retries';
  console.error(`[SMS] ❌ All attempts failed for ${to}: ${failMsg}`);

  await prisma.smsLog.update({
    where: { id: log.id },
    data: {
      status: 'FAILED',
      failureReason: failMsg,
    }
  });

  throw new Error(`SMS delivery failed for ${to}: ${failMsg}`);
}

// ── Non-Throwing Wrapper ────────────────────────────────────────────────────────

/**
 * Try to send an SMS, but never throw. Logs failures instead.
 * Use this for non-critical messages (vote confirmations, candidate notifications)
 * where a failed SMS should NOT break the calling operation.
 * 
 * Returns true if sent successfully, false otherwise.
 */
export async function trySendSMS(to: string, message: string): Promise<boolean> {
  try {
    await sendSMS(to, message);
    return true;
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`[SMS] trySendSMS failed silently for ${to}: ${error.message}`);
    return false;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

/**
 * Extract the first recipient from AT's response, handling various response shapes.
 */
function extractRecipient(result: unknown): ATRecipient | null {
  if (!result || typeof result !== 'object') return null;
  const res = result as Partial<ATSendResult> & Record<string, unknown>;
  
  // Standard shape: result.SMSMessageData.Recipients[0]
  const recipients =
    res?.SMSMessageData?.Recipients ||
    (res as Record<string, unknown>)?.SMSMessageData?.recipients ||
    (res as Record<string, unknown>)?.recipients;

  if (Array.isArray(recipients) && recipients.length > 0) {
    return recipients[0] as ATRecipient;
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── SMS Templates ───────────────────────────────────────────────────────────────

export const SMS_TEMPLATES = {
  otp: (code: string) =>
    `Your ELP Moi Chapter voting OTP is: ${code}. Valid for 5 minutes. Do not share.`,
  candidateReceived: (position: string) =>
    `ELP Moi Chapter: Your candidacy application for ${position} has been received. You will be notified once reviewed by the IEC.`,
  candidateApproved: (position: string) =>
    `ELP Moi Chapter: Congratulations! Your candidacy for ${position} has been APPROVED. You will appear on the ballot.`,
  candidateRejected: (position: string, reason: string) =>
    `ELP Moi Chapter: Your candidacy for ${position} has not been approved. Reason: ${reason}. Contact the IEC for clarification.`,
  voteConfirmation: () =>
    `Your vote has been successfully cast. Thank you for participating in ELP Moi Chapter elections.`,
} as const;
