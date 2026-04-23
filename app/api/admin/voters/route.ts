import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { success, error, serverError } from "@/lib/response";
import { normalizePhone } from "@/lib/phone";
import { requireAdminSession } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

// Schema for adding a single voter
const addVoterSchema = z.object({
  phone: z.string().min(1, "Phone is required"),
  name: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if ("response" in auth) return auth.response;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { phone: { contains: search } },
            { name: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [voters, total] = await Promise.all([
      prisma.voter.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.voter.count({ where }),
    ]);

    return success(voters, 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if ("response" in auth) return auth.response;

    const body = await req.json();
    const result = addVoterSchema.safeParse(body);

    if (!result.success) {
      return error(result.error.issues[0].message, 400);
    }

    const { phone, name } = result.data;

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return error("Invalid Kenyan phone number format.", 400);
    }

    // Check for duplicates
    const existing = await prisma.voter.findUnique({
      where: { phone: normalizedPhone },
    });

    if (existing) {
      return error("This phone number is already registered.", 409);
    }

    const voter = await prisma.voter.create({
      data: {
        phone: normalizedPhone,
        name: name || null,
        addedById: auth.admin.id,
      },
    });

    await logAudit(req, auth.admin.id, "ADD_VOTER", "Voter", voter.id, {
      phone: voter.phone,
      name: voter.name,
    });

    return success({ message: "Voter added successfully", voter }, 201);
  } catch (err) {
    return serverError(err);
  }
}
