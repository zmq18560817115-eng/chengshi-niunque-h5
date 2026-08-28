import { NextResponse } from "next/server";
import { PublicContentService } from "@/server/services/public-content-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const content = await new PublicContentService().getContent();
    return NextResponse.json(content, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "PUBLIC_CONTENT_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "3" } },
    );
  }
}
