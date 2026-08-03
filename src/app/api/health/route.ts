import { NextResponse } from "next/server";
import { getHealthStatus } from "@/server/services/health-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getHealthStatus();
  return NextResponse.json(result.body, {
    status: result.healthy ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
