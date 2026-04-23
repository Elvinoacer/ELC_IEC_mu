import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Webhook for Africa's Talking Delivery Reports
 * Documentation: https://developers.africastalking.com/docs/sms/delivery_reports
 */
export async function POST(req: NextRequest) {
  try {
    // AT sends delivery reports as form-data or JSON depending on configuration
    // We'll try to handle both, but usually it's application/x-www-form-urlencoded
    const contentType = req.headers.get('content-type') || '';
    let body: any;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries());
    } else {
      body = await req.json();
    }

    const { phoneNumber, id, status, failureReason } = body;

    console.log(`[Webhook] Received delivery report for ${id} (${phoneNumber}): ${status}`);

    if (!id) {
      return new Response('Missing message ID', { status: 400 });
    }

    // Update the log record in our database
    await prisma.smsLog.update({
      where: { messageId: id },
      data: {
        status: status.toUpperCase(),
        failureReason: failureReason || null,
      }
    });

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('[Webhook Error] Failed to process delivery report:', err);
    // Return 200 anyway to prevent AT from retrying indefinitely if it's a logic error on our side
    // but log it for investigation.
    return new Response('Webhook Error', { status: 200 });
  }
}
