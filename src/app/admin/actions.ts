"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AdminAuthService } from "@/server/services/admin-auth-service";
import { AdminContentService } from "@/server/services/admin-content-service";
import { requireCurrentAdmin } from "@/server/auth/request-session";
import { ADMIN_SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/server/auth/token";

export type LoginState = { error?: string };

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const result = await new AdminAuthService().login(email, password, ipAddress);
  if (!result) return { error: "邮箱或密码不正确，或尝试次数过多，请稍后再试。" };
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, result.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    expires: result.expiresAt,
  });
  redirect("/admin");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  await new AdminAuthService().logout(token);
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  redirect("/admin/login");
}

function values(formData: FormData): Record<string, unknown> { return Object.fromEntries(formData.entries()); }

export async function createModuleAction(formData: FormData) { const admin = await requireCurrentAdmin(); await new AdminContentService().createModule(values(formData), admin.id); revalidatePath("/admin"); redirect("/admin/modules"); }
export async function updateModuleAction(formData: FormData) { const admin = await requireCurrentAdmin(); const id = String(formData.get("id")); await new AdminContentService().updateModule(id, values(formData), admin.id); revalidatePath("/admin"); redirect(`/admin/modules/${id}`); }
export async function deleteModuleAction(formData: FormData) { const admin = await requireCurrentAdmin(); await new AdminContentService().deleteModule(String(formData.get("id")), admin.id); revalidatePath("/admin"); redirect("/admin/modules"); }

export async function createCardAction(formData: FormData) { const admin = await requireCurrentAdmin(); const moduleId = String(formData.get("moduleId")); await new AdminContentService().createCard(values(formData), admin.id); revalidatePath("/admin"); redirect(`/admin/modules/${moduleId}`); }
export async function updateCardAction(formData: FormData) { const admin = await requireCurrentAdmin(); const id = String(formData.get("id")); const moduleId = String(formData.get("moduleId")); await new AdminContentService().updateCard(id, values(formData), admin.id); revalidatePath("/admin"); redirect(`/admin/modules/${moduleId}`); }
export async function deleteCardAction(formData: FormData) { const admin = await requireCurrentAdmin(); const id = String(formData.get("id")); const moduleId = String(formData.get("moduleId")); await new AdminContentService().deleteCard(id, admin.id); revalidatePath("/admin"); redirect(`/admin/modules/${moduleId}`); }

export async function createAssetAction(formData: FormData) { const admin = await requireCurrentAdmin(); const reportCardId = String(formData.get("reportCardId")); await new AdminContentService().createAsset(values(formData), admin.id); revalidatePath("/admin"); redirect(`/admin/cards/${reportCardId}`); }
export async function updateAssetAction(formData: FormData) { const admin = await requireCurrentAdmin(); const id = String(formData.get("id")); const reportCardId = String(formData.get("reportCardId")); await new AdminContentService().updateAsset(id, values(formData), admin.id); revalidatePath("/admin"); redirect(`/admin/cards/${reportCardId}`); }
export async function deleteAssetAction(formData: FormData) { const admin = await requireCurrentAdmin(); const id = String(formData.get("id")); const reportCardId = String(formData.get("reportCardId")); await new AdminContentService().deleteAsset(id, admin.id); revalidatePath("/admin"); redirect(`/admin/cards/${reportCardId}`); }
