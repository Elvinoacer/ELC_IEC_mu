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
        voterRegOpensAt: true,
        voterRegClosesAt: true,
        isManuallyClosed: true,
      }
    });
    
    if (!config) {
      return success({ 
        isConfigured: false,
        isManuallyClosed: false
      });
    }
    
    return success({ 
      ...config, 
      isConfigured: true 
    });
  } catch (err) {
    return serverError(err);
  }
}
