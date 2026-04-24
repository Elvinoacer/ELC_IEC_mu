import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { success, error, serverError } from "@/lib/response";
import { normalizePhone } from "@/lib/phone";
import { requireAdminSession } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

const bulkVoterSchema = z.array(
  z.object({
    phone: z.string(),
    name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
  }),
);

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if ("response" in auth) return auth.response;

    const adminId = auth.admin.id;

    const body = await req.json();
    const result = bulkVoterSchema.safeParse(body);

    if (!result.success) {
      return error(
        "Invalid payload format. Expected array of { phone, name } objects.",
        400,
      );
    }

    const rows = result.data;
    if (rows.length === 0) {
      return error("No data provided", 400);
    }

    // Process rows
    let validCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    const validVotersToInsert: {
      phone: string;
      name?: string | null;
      email?: string | null;
      emailVerified?: boolean;
      addedById: number | null;
    }[] = [];
    const seenPhonesInBatch = new Set<string>();

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const row of rows) {
      const normalized = normalizePhone(row.phone);
      if (!normalized) {
        invalidCount++;
        continue;
      }

      // Duplicate within the batch
      if (seenPhonesInBatch.has(normalized)) {
        duplicateCount++;
        continue;
      }
      seenPhonesInBatch.add(normalized);

      // Validate email if provided
      let validEmail: string | null = null;
      if (row.email && typeof row.email === 'string' && row.email.trim()) {
        const trimmedEmail = row.email.trim();
        if (emailRegex.test(trimmedEmail)) {
          validEmail = trimmedEmail;
        }
        // If email is invalid, we still add the voter but without email
      }

      validVotersToInsert.push({
        phone: normalized,
        name: row.name,
        email: validEmail,
        emailVerified: false, // Voters must self-verify via Phase A
        addedById: adminId,
      });
    }

    // Now filter out duplicates against the DB
    const existingPhones = await prisma.voter.findMany({
      where: { phone: { in: Array.from(seenPhonesInBatch) } },
      select: { phone: true },
    });

    const existingSet = new Set(existingPhones.map((v) => v.phone));

    const finalVotersToInsert = validVotersToInsert.filter((v) => {
      if (existingSet.has(v.phone)) {
        duplicateCount++;
        return false;
      }
      return true;
    });

    if (finalVotersToInsert.length > 0) {
      await prisma.voter.createMany({
        data: finalVotersToInsert,
        skipDuplicates: true, // extra safety
      });
      validCount = finalVotersToInsert.length;
    }

    await logAudit(req, adminId, "BULK_IMPORT_VOTERS", "Voter", undefined, {
      added: validCount,
      duplicates: duplicateCount,
      invalid: invalidCount,
      total: rows.length,
    });

    return success({
      message: "Bulk import completed",
      summary: {
        added: validCount,
        skippedDuplicates: duplicateCount,
        skippedInvalid: invalidCount,
        totalProcessed: rows.length,
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
