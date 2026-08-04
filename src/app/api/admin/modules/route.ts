import { NextRequest, NextResponse } from "next/server";
import { AdminAuthService } from "@/server/services/admin-auth-service";
import { AdminContentService } from "@/server/services/admin-content-service";
import { ADMIN_SESSION_COOKIE } from "@/server/auth/token";

export async function POST(request: NextRequest) {
  const admin = await new AdminAuthService().authenticateToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const item = await new AdminContentService().createModule(await request.json(), admin.id);
    return NextResponse.json({ id: item.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
}
