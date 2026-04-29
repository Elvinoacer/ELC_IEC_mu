import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { success, error, serverError } from "@/lib/response";
import { normalizePhone } from "@/lib/phone";
import { requireAdminSession } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { Prisma } from "@/app/generated/prisma/client";

// Schema for adding a single voter
const addVoterSchema = z.object({
  phone: z.string().min(1, "Phone is required"),
  name: z.string().optional(),
  email: z.string().email("Invalid email format").optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if ("response" in auth) return auth.response;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const filter = searchParams.get("filter") || "all";

    const skip = (page - 1) * limit;

    const statusFilter: Prisma.VoterWhereInput =
      filter === 'registered'   ? { emailVerified: true } :
      filter === 'unregistered' ? { OR: [{ emailVerified: false }, { email: null }] } :
      filter === 'voted'        ? { hasVoted: true } :
      filter === 'not_voted'    ? { hasVoted: false } : {};

    const where: Prisma.VoterWhereInput = {
      ...statusFilter,
      ...(search ? {
        OR: [
          { phone: { contains: search } },
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      } : {})
    };

    const [voters, total, counts] = await Promise.all([
      prisma.voter.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { emailVerified: "desc" },
          { createdAt: "desc" },
        ],
      }),
      prisma.voter.count({ where }),
      Promise.all([
        prisma.voter.count(),
        prisma.voter.count({ where: { emailVerified: true } }),
        prisma.voter.count({ where: { OR: [{ emailVerified: false }, { email: null }] } }),
        prisma.voter.count({ where: { hasVoted: true } }),
      ]).then(([all, registered, unregistered, voted]) => ({
        all, registered, unregistered, voted
      }))
    ]);

    return success(voters, 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      counts
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

    const { phone, name, email } = result.data;

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
        email: email || null,
        emailVerified: false,
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
