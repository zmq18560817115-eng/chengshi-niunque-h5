import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminAuthService } from "@/server/services/admin-auth-service";
import { ADMIN_SESSION_COOKIE } from "./token";

export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  return new AdminAuthService().authenticateToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function requireCurrentAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
