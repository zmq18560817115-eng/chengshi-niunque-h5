"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AdminAuthService } from "@/server/services/admin-auth-service";
import { LatestBatchService } from "@/server/services/latest-batch-service";
import type { LatestBatch } from "@/config/h5-latest-batch";
import { requireCurrentAdmin } from "@/server/auth/request-session";
import { ADMIN_SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/server/auth/token";

export type LoginState = { error?: string };
export type LatestBatchState = { error?: string; saved?: boolean; value?: LatestBatch };

export async function publishLatestBatchAction(_state: LatestBatchState, formData: FormData): Promise<LatestBatchState> {
  const admin = await requireCurrentAdmin();
  try {
    const value = await new LatestBatchService().publish(Object.fromEntries(formData.entries()), admin.id);
    revalidateContentPaths();
    revalidatePath("/admin/site");
    revalidatePath("/go");
    return { saved: true, value };
  } catch (error) {
    return { error: adminError(error), value: _state.value };
  }
}

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const account = String(formData.get("account") ?? "");
  const password = String(formData.get("password") ?? "");
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const result = await new AdminAuthService().login(account, password, ipAddress);
  if (!result) return { error: "账号或密码不正确，或尝试次数过多，请稍后再试。" };
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

function adminError(error: unknown): string {
  return error instanceof Error ? error.message : "操作未完成，请检查填写内容后重试";
}

function revalidateContentPaths() {
  revalidatePath("/admin");
  revalidatePath("/api/public/content");
  revalidatePath("/reports", "layout");
}

// Legacy forms may still be open in an old browser tab. Reject all broad
// mutations; the dedicated image actions accept only uploaded files and IDs.
async function rejectLegacyEdit() {
  await requireCurrentAdmin();
  throw new Error("管理端已调整，请刷新并使用公开批次或报告图片管理。分类、文案和页面结构不可修改。");
}
export async function createModuleAction() { return rejectLegacyEdit(); }
export async function updateModuleAction() { return rejectLegacyEdit(); }
export async function deleteModuleAction() { return rejectLegacyEdit(); }
export async function moveModuleAction() { return rejectLegacyEdit(); }
export async function createCardAction() { return rejectLegacyEdit(); }
export async function updateCardAction() { return rejectLegacyEdit(); }
export async function deleteCardAction() { return rejectLegacyEdit(); }
export async function createAssetAction() { return rejectLegacyEdit(); }
export async function createAndPublishAssetAction() { return rejectLegacyEdit(); }
export async function updateAssetAction() { return rejectLegacyEdit(); }
export async function deleteAssetAction() { return rejectLegacyEdit(); }
