import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { success, error, serverError } from '@/lib/response';

const schema = z.object({
  deviceHash: z.string().optional(),
});

/**
 * Checks if a device has already completed email registration.
 * This provides immediate feedback to users returning on the same device.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) return error(parsed.error.issues[0].message, 400);

    const { deviceHash } = parsed.data;
    if (!deviceHash) {
      return success({ isRegisteredOnThisDevice: false });
    }

    const voter = await prisma.voter.findFirst({
      where: {
        deviceHash,
        emailVerified: true,
      },
      select: { 
        id: true,
        phone: true,
        email: true,
      },
    });

    if (voter) {
      // Mask the email for privacy
      const [user, domain] = (voter.email || '').split('@');
      const maskedEmail = user.length > 2 
        ? `${user.substring(0, 2)}***@${domain}` 
        : `***@${domain}`;
        
      return success({ 
        isRegisteredOnThisDevice: true,
        phone: voter.phone,
        maskedEmail
      });
    }

    return success({ isRegisteredOnThisDevice: false });
  } catch (err) {
    return serverError(err);
  }
}
