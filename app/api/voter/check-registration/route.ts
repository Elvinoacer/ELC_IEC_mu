import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { success, error, serverError } from "@/lib/response";
import { normalizePhone } from "@/lib/phone";
import { maskEmail } from "@/lib/email";

const schema = z.object({
  phone: z.string().min(1, 'Phone is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) return error(result.error.issues[0].message, 400);

    const normalizedPhone = normalizePhone(result.data.phone);
    if (!normalizedPhone) return error('Invalid phone number format.', 400);

    const voter = await prisma.voter.findUnique({ 
      where: { phone: normalizedPhone },
      select: {
        id: true,
        email: true,
        emailVerified: true,
      }
    });

    if (!voter) {
      return error('This phone number is not registered in the ELP voter registry.', 404);
    }

    return success({
      isRegistered: !!(voter.email && voter.emailVerified),
      maskedEmail: voter.email ? maskEmail(voter.email) : null,
    });
  } catch (err) {
    return serverError(err);
  }
}
