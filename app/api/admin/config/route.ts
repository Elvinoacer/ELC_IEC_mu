import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { success, error, serverError } from "@/lib/response";
import { requireAdminSession } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

const configSchema = z.object({
  opensAt: z.string().datetime(),
  closesAt: z.string().datetime(),
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

    let config = await prisma.votingConfig.findUnique({ where: { id: 1 } });
    
    if (!config) {
      // Create default if not exists
      config = await prisma.votingConfig.create({
        data: {
          id: 1,
          opensAt: new Date(),
          closesAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24h
        }
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

    // Validate non-overlap: Registration must end before Voting starts
    if (data.candidateRegOpensAt && data.candidateRegClosesAt) {
      const regOpen = new Date(data.candidateRegOpensAt);
      const regClose = new Date(data.candidateRegClosesAt);
      const voteOpen = new Date(data.opensAt);
      const voteClose = new Date(data.closesAt);

      if (regClose > voteOpen) {
        return error("Registration window cannot overlap with the voting window. Registration must close before voting opens.", 400);
      }
      
      if (regOpen >= regClose) {
        return error("Registration opening date must be before the closing date.", 400);
      }
    }

    if (new Date(data.opensAt) >= new Date(data.closesAt)) {
      return error("Voting opening date must be before the closing date.", 400);
    }

    const oldConfig = await prisma.votingConfig.findUnique({ where: { id: 1 } });

    const config = await prisma.votingConfig.upsert({
      where: { id: 1 },
      update: {
        opensAt: new Date(data.opensAt),
        closesAt: new Date(data.closesAt),
        candidateRegOpensAt: data.candidateRegOpensAt ? new Date(data.candidateRegOpensAt) : null,
        candidateRegClosesAt: data.candidateRegClosesAt ? new Date(data.candidateRegClosesAt) : null,
        voterRegOpensAt: data.voterRegOpensAt ? new Date(data.voterRegOpensAt) : null,
        voterRegClosesAt: data.voterRegClosesAt ? new Date(data.voterRegClosesAt) : null,
        isManuallyClosed: data.isManuallyClosed ?? false,
        updatedById: adminId,
        updatedAt: new Date(),
      },
      create: {
        id: 1,
        opensAt: new Date(data.opensAt),
        closesAt: new Date(data.closesAt),
        candidateRegOpensAt: data.candidateRegOpensAt ? new Date(data.candidateRegOpensAt) : null,
        candidateRegClosesAt: data.candidateRegClosesAt ? new Date(data.candidateRegClosesAt) : null,
        voterRegOpensAt: data.voterRegOpensAt ? new Date(data.voterRegOpensAt) : null,
        voterRegClosesAt: data.voterRegClosesAt ? new Date(data.voterRegClosesAt) : null,
        isManuallyClosed: data.isManuallyClosed ?? false,
        updatedById: adminId,
      },
    });

    await logAudit(
      req,
      adminId,
      "UPDATE_CONFIG",
      "VotingConfig",
      1,
      { old: oldConfig, new: config }
    );

    return success({ message: "Configuration updated successfully", config });
  } catch (err) {
    return serverError(err);
  }
}
