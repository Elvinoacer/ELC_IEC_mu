import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { success, serverError } from "@/lib/response";

export async function GET(req: NextRequest) {
  try {
    const config = await prisma.votingConfig.findUnique({ 
      where: { id: 1 },
      select: {
        opensAt: true,
        closesAt: true,
        candidateRegOpensAt: true,
        candidateRegClosesAt: true,
        isManuallyClosed: true,
      }
    });
    
    if (!config) {
      return success({ 
        opensAt: new Date(), 
        closesAt: new Date(Date.now() + 86400000),
        candidateRegOpensAt: null,
        candidateRegClosesAt: null,
        isManuallyClosed: false
      });
    }

    return success(config);
  } catch (err) {
    return serverError(err);
  }
}
