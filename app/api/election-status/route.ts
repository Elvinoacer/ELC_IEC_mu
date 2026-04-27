import prisma from "@/lib/prisma";
import { success, serverError } from "@/lib/response";

export async function GET() {
  try {
    const config = await prisma.votingConfig.findFirst({
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: {
        opensAt: true,
        closesAt: true,
        candidateRegOpensAt: true,
        candidateRegClosesAt: true,
        voterRegOpensAt: true,
        voterRegClosesAt: true,
        isManuallyClosed: true,
      },
    });

    if (!config) {
      return success({
        isConfigured: false,
        isManuallyClosed: false,
      });
    }

    return success({
      ...config,
      isConfigured: true,
    });
  } catch (err) {
    return serverError(err);
  }
}
