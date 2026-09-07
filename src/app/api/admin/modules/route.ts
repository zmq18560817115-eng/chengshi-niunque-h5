import { NextRequest, NextResponse } from "next/server";
import { AdminAuthService } from "@/server/services/admin-auth-service";
import { ADMIN_SESSION_COOKIE } from "@/server/auth/token";

export async function POST(request: NextRequest) {
  const admin = await new AdminAuthService().authenticateToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  return NextResponse.json({ error: "CONTENT_STRUCTURE_LOCKED", message: "分类与卡片结构已固定，请使用报告图片管理。" }, { status: 405 });
}
