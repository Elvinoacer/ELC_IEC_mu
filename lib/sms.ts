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
    };

    if (process.env.AT_SENDER_ID) {
      options.from = process.env.AT_SENDER_ID;
    }

    const result = (await sms.send(options)) as any;

    // Extract messageId from the result (usually it's in SMSMessageData.Recipients[0].messageId)
    const recipient = result?.SMSMessageData?.Recipients?.[0];
    const messageId = recipient?.messageId;
    const status = recipient?.status || 'Sent';

    await prisma.smsLog.update({
      where: { id: log.id },
      data: { 
        messageId,
        status: status.toUpperCase(),
      }
    });

    console.log(`[SMS] Sent to ${to}: Status=${status}, ID=${messageId}`);
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
