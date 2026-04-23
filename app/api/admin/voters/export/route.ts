import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if ("response" in auth) return auth.response;

    const voters = await prisma.voter.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Generate CSV
    const header = ["ID", "Phone", "Name", "Has Voted", "Voted At", "Added At"].join(",");
    const rows = voters.map(v => {
      return [
        v.id,
        `"${v.phone}"`,
        `"${v.name || ''}"`,
        v.hasVoted ? "Yes" : "No",
        v.votedAt ? `"${v.votedAt.toISOString()}"` : "",
        `"${v.createdAt.toISOString()}"`
      ].join(",");
    });

    const csvContent = [header, ...rows].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="voters_export_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (err) {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
