/**
 * Africa's Talking SMS Integration
 */

import AfricasTalking from 'africastalking';
import prisma from './prisma';

const at = AfricasTalking({
  apiKey: process.env.AT_API_KEY || 'dummy_key',
  username: process.env.AT_USERNAME || 'sandbox',
});

const sms = at.SMS;

export async function sendSMS(to: string, message: string): Promise<void> {
  const username = process.env.AT_USERNAME || 'sandbox';
  const isSandbox = username.toLowerCase() === 'sandbox';

  // Always create a log record first
  const log = await prisma.smsLog.create({
    data: {
      phone: to,
      message,
      status: 'PENDING',
    }
  });

  if (isSandbox) {
    console.log(`\n📱 [SMS SIMULATION → ${to}]\n${message}\n`);
    await prisma.smsLog.update({
      where: { id: log.id },
      data: { status: 'SIMULATED' }
    });
    return;
  }

  if (!process.env.AT_API_KEY) {
    const errorMsg = 'AT_API_KEY is missing but username is not sandbox. Cannot send real SMS.';
    console.error(`[SMS] ${errorMsg}`);
    await prisma.smsLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', failureReason: errorMsg }
    });
    throw new Error(errorMsg);
  }

  try {
    const options: any = {
      to: [to],
      message,
      enqueue: true,
    };

    // Only use senderId if it is truly approved and mapped to your account
    const senderId = process.env.AT_SENDER_ID?.trim();
    if (senderId) {
      options.senderId = senderId;
    }

    console.log("[SMS Options]", JSON.stringify(options, null, 2));
    const result = (await sms.send(options)) as any;
    console.log("[AfricaTalking SMS result]", JSON.stringify(result, null, 2));

    const recipient = result?.SMSMessageData?.Recipients?.[0] || 
                     result?.SMSMessageData?.recipients?.[0] || 
                     result?.recipients?.[0];

    if (!recipient) {
      throw new Error(`No recipient response from Africa's Talking: ${JSON.stringify(result)}`);
    }

    // Africa's Talking status codes: 100=Processed, 101=Sent, 102=Queued
    const statusCode = Number(recipient.statusCode);
    if (![100, 101, 102].includes(statusCode)) {
      throw new Error(
        `Africa's Talking rejected SMS. statusCode=${recipient.statusCode}, status=${recipient.status}, number=${recipient.number}`
      );
    }

    const messageId = recipient?.messageId || 
                     recipient?.messageID || 
                     recipient?.MessageId || 
                     recipient?.id || 
                     recipient?.messageParts?.[0]?.id;

    const status = recipient?.status || 'Sent';

    await prisma.smsLog.update({
      where: { id: log.id },
      data: { 
        messageId: messageId?.toString(),
        status: status.toUpperCase(),
      }
    });

    console.log(`[SMS] Sent to ${to}: Status=${status}, ID=${messageId ?? 'N/A'}`);
  } catch (err: any) {
    console.error(`[SMS] Failed to send to ${to}:`, err);
    await prisma.smsLog.update({
      where: { id: log.id },
      data: { 
        status: 'FAILED',
        failureReason: err.message || 'Unknown error'
      }
    });
    throw new Error(`SMS delivery failed for ${to}: ${err.message}`);
  }
}

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
