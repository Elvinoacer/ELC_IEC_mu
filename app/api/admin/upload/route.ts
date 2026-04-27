import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/s3";
import { requireAdminSession } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if ("response" in auth) return auth.response;

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await uploadFile(buffer, file.name, file.type);

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { error: "Failed to upload file to storage" },
      { status: 500 }
    );
  }
}
