"use server";

import { cookies, headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AdminAuthService } from "@/server/services/admin-auth-service";
import { AdminContentService } from "@/server/services/admin-content-service";
import { getObjectStorage } from "@/server/storage";
import { validateReportFile } from "@/server/upload/report-file";
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

function adminError(error: unknown): string {
  return error instanceof Error ? error.message : "操作未完成，请检查填写内容后重试";
}

function moduleEditorUrl(moduleId: string, options: { saved?: boolean; published?: boolean; select?: string; error?: string } = {}) {
  const query = new URLSearchParams();
  if (options.saved) query.set("saved", "1");
  if (options.published) query.set("published", "1");
  if (options.select) query.set("select", options.select);
  if (options.error) query.set("error", options.error);
  return `/admin/modules/${moduleId}${query.size ? `?${query.toString()}` : ""}`;
}

async function assetValues(formData: FormData): Promise<{ input: Record<string, unknown>; uploadedKey?: string }> {
  const input = values(formData);
  const type = String(formData.get("assetType") ?? "");
  const file = formData.get("file");
  if ((type === "PDF" || type === "IMAGE") && file instanceof File && file.size > 0) {
    const checked = await validateReportFile(file, type);
    const extension = checked.extension;
    const key = `reports/${new Date().getUTCFullYear()}/${randomUUID()}.${extension}`;
    await getObjectStorage().put(key, checked.body, checked.contentType);
    input.storageKey = key;
    input.mimeType = checked.contentType;
    input.byteSize = file.size;
    return { input, uploadedKey: key };
  }
  return { input };
}

async function removeFailedUpload(key?: string) { if (key) await getObjectStorage().remove(key).catch(() => undefined); }

export async function createModuleAction(formData: FormData) {
  const admin = await requireCurrentAdmin();
  const input = values(formData);
  if (!String(input.slug ?? "").trim()) input.slug = `module-${randomUUID()}`;
  const created = await new AdminContentService().createModule(input, admin.id);
  revalidatePath("/admin");
  redirect(`/admin/modules/${created.id}?saved=1`);
}
export async function updateModuleAction(formData: FormData) { const admin = await requireCurrentAdmin(); const id = String(formData.get("id")); try { await new AdminContentService().updateModule(id, values(formData), admin.id); } catch (error) { redirect(moduleEditorUrl(id, { error: adminError(error) })); } revalidatePath("/admin"); redirect(moduleEditorUrl(id, { saved: true })); }
export async function deleteModuleAction(formData: FormData) { const admin = await requireCurrentAdmin(); await new AdminContentService().deleteModule(String(formData.get("id")), admin.id); revalidatePath("/admin"); redirect("/admin/modules"); }
export async function moveModuleAction(formData: FormData) { const admin = await requireCurrentAdmin(); const id = String(formData.get("id")); const direction = formData.get("direction") === "up" ? "up" : "down"; await new AdminContentService().moveModule(id, direction, admin.id); revalidatePath("/admin/modules"); }
export async function createCardAction(formData: FormData) { const admin = await requireCurrentAdmin(); const moduleId = String(formData.get("moduleId")); const created = await new AdminContentService().createCard(values(formData), admin.id); revalidatePath("/admin"); redirect(`/admin/modules/${moduleId}?saved=1&select=card:${created.id}`); }
export async function updateCardAction(formData: FormData) { const admin = await requireCurrentAdmin(); const id = String(formData.get("id")); const moduleId = String(formData.get("moduleId")); try { await new AdminContentService().updateCard(id, values(formData), admin.id); } catch (error) { redirect(moduleEditorUrl(moduleId, { select: `card:${id}`, error: adminError(error) })); } revalidatePath("/admin"); redirect(moduleEditorUrl(moduleId, { saved: true, select: `card:${id}` })); }
export async function deleteCardAction(formData: FormData) { const admin = await requireCurrentAdmin(); const id = String(formData.get("id")); const moduleId = String(formData.get("moduleId")); await new AdminContentService().deleteCard(id, admin.id); revalidatePath("/admin"); redirect(`/admin/modules/${moduleId}`); }

async function createAsset(formData: FormData, publishCard: boolean) {
  const admin = await requireCurrentAdmin();
  const reportCardId = String(formData.get("reportCardId"));
  const service = new AdminContentService();
  const card = await service.getCard(reportCardId);
  if (!card) redirect("/admin/modules?error=card-not-found");
  const upload = await assetValues(formData);
  if (publishCard) upload.input.status = "PUBLISHED";
  let createdId: string;
  try { const created = await service.createAsset(upload.input, admin.id); createdId = created.id; }
  catch (error) { await removeFailedUpload(upload.uploadedKey); redirect(moduleEditorUrl(card.moduleId, { select: `card:${reportCardId}`, error: adminError(error) })); }
  if (publishCard) {
    try { await service.updateCard(reportCardId, { moduleId: card.moduleId, title: card.title, description: card.description ?? "", buttonText: card.buttonText, footerNote: card.footerNote ?? "", sortOrder: card.sortOrder, status: "PUBLISHED" }, admin.id); }
    catch (error) { redirect(moduleEditorUrl(card.moduleId, { select: `card:${reportCardId}`, error: `资料已保存，但卡片未上线：${adminError(error)}` })); }
  }
  revalidatePath("/admin");
  redirect(moduleEditorUrl(card.moduleId, publishCard ? { saved: true, published: true, select: `card:${reportCardId}` } : { saved: true, select: `asset:${createdId}` }));
}
export async function createAssetAction(formData: FormData) { return createAsset(formData, false); }
export async function createAndPublishAssetAction(formData: FormData) { return createAsset(formData, true); }
export async function updateAssetAction(formData: FormData) { const admin = await requireCurrentAdmin(); const id = String(formData.get("id")); const reportCardId = String(formData.get("reportCardId")); const service = new AdminContentService(); const card = await service.getCard(reportCardId); if (!card) redirect("/admin/modules?error=card-not-found"); const upload = await assetValues(formData); try { await service.updateAsset(id, upload.input, admin.id); } catch (error) { await removeFailedUpload(upload.uploadedKey); redirect(moduleEditorUrl(card.moduleId, { select: `asset:${id}`, error: adminError(error) })); } revalidatePath("/admin"); redirect(moduleEditorUrl(card.moduleId, { saved: true, select: `asset:${id}` })); }
export async function deleteAssetAction(formData: FormData) { const admin = await requireCurrentAdmin(); const id = String(formData.get("id")); const reportCardId = String(formData.get("reportCardId")); const service = new AdminContentService(); const card = await service.getCard(reportCardId); if (!card) throw new Error("所属卡片不存在"); await service.deleteAsset(id, admin.id); revalidatePath("/admin"); redirect(`/admin/modules/${card.moduleId}?saved=1`); }
