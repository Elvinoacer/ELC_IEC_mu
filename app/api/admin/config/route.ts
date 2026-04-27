import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { success, error, serverError } from "@/lib/response";
import { requireAdminSession } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

const configSchema = z.object({
  opensAt: z.string().datetime().optional(),
  closesAt: z.string().datetime().optional(),
  candidateRegOpensAt: z.string().datetime().optional().nullable(),
  candidateRegClosesAt: z.string().datetime().optional().nullable(),
  voterRegOpensAt: z.string().datetime().optional().nullable(),
  voterRegClosesAt: z.string().datetime().optional().nullable(),
  isManuallyClosed: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if ("response" in auth) return auth.response;

    let config = await prisma.votingConfig.findFirst({
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    });

    if (!config) {
      // Create default if not exists
      config = await prisma.votingConfig.create({
        data: {
          id: 1,
          opensAt: new Date(),
          closesAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24h
        },
      });
    }

    return success(config);
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if ("response" in auth) return auth.response;

    const body = await req.json();
    const result = configSchema.safeParse(body);

    if (!result.success) {
      return error(result.error.issues[0].message, 400);
    }

    const data = result.data;
    const adminId = auth.admin.id;

    const currentConfig = await prisma.votingConfig.findFirst({
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    });

    const opensAtDate = data.opensAt
      ? new Date(data.opensAt)
      : (currentConfig?.opensAt ?? null);
    const closesAtDate = data.closesAt
      ? new Date(data.closesAt)
      : (currentConfig?.closesAt ?? null);

    if (!opensAtDate || !closesAtDate) {
      return error(
        "Voting window opensAt and closesAt must be configured.",
        400,
      );
    }

    const candidateRegOpensAtDate =
      data.candidateRegOpensAt === undefined
        ? (currentConfig?.candidateRegOpensAt ?? null)
        : data.candidateRegOpensAt
          ? new Date(data.candidateRegOpensAt)
          : null;

    const candidateRegClosesAtDate =
      data.candidateRegClosesAt === undefined
        ? (currentConfig?.candidateRegClosesAt ?? null)
        : data.candidateRegClosesAt
          ? new Date(data.candidateRegClosesAt)
          : null;

    const voterRegOpensAtDate =
      data.voterRegOpensAt === undefined
        ? (currentConfig?.voterRegOpensAt ?? null)
        : data.voterRegOpensAt
          ? new Date(data.voterRegOpensAt)
          : null;

    const voterRegClosesAtDate =
      data.voterRegClosesAt === undefined
        ? (currentConfig?.voterRegClosesAt ?? null)
        : data.voterRegClosesAt
          ? new Date(data.voterRegClosesAt)
          : null;

    const isManuallyClosed =
      data.isManuallyClosed ?? currentConfig?.isManuallyClosed ?? false;

    // Validate non-overlap: Registration must end before Voting starts
    if (candidateRegOpensAtDate && candidateRegClosesAtDate) {
      const regOpen = candidateRegOpensAtDate;
      const regClose = candidateRegClosesAtDate;
      const voteOpen = opensAtDate;

      if (regClose > voteOpen) {
        return error(
          "Registration window cannot overlap with the voting window. Registration must close before voting opens.",
          400,
        );
      }

      if (regOpen >= regClose) {
        return error(
          "Registration opening date must be before the closing date.",
          400,
        );
      }
    }

    if (opensAtDate >= closesAtDate) {
      return error("Voting opening date must be before the closing date.", 400);
    }

    const oldConfig = currentConfig;
    const targetId = currentConfig?.id ?? 1;

    const config = await prisma.votingConfig.upsert({
      where: { id: targetId },
      update: {
        opensAt: opensAtDate,
        closesAt: closesAtDate,
        candidateRegOpensAt: candidateRegOpensAtDate,
        candidateRegClosesAt: candidateRegClosesAtDate,
        voterRegOpensAt: voterRegOpensAtDate,
        voterRegClosesAt: voterRegClosesAtDate,
        isManuallyClosed,
        updatedById: adminId,
        updatedAt: new Date(),
      },
      create: {
        id: targetId,
        opensAt: opensAtDate,
        closesAt: closesAtDate,
        candidateRegOpensAt: candidateRegOpensAtDate,
        candidateRegClosesAt: candidateRegClosesAtDate,
        voterRegOpensAt: voterRegOpensAtDate,
        voterRegClosesAt: voterRegClosesAtDate,
        isManuallyClosed,
        updatedById: adminId,
      },
    });

    await logAudit(req, adminId, "UPDATE_CONFIG", "VotingConfig", targetId, {
      old: oldConfig,
      new: config,
    });

    return success({ message: "Configuration updated successfully", config });
  } catch (err) {
    return serverError(err);
  }
}
