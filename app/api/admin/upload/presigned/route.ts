import { NextResponse } from "next/server";
import { getPresignedUploadUrl } from "@/lib/s3";

export async function POST(req: Request) {
  try {
    const { fileName, contentType } = await req.json();

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "fileName and contentType are required" },
        { status: 400 }
      );
    }

    const data = await getPresignedUploadUrl(fileName, contentType);

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Presigned URL error:", error);
    return NextResponse.json(
      { error: "Failed to generate presigned URL" },
      { status: 500 }
    );
  }
}
