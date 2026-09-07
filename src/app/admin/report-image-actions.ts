"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentAdmin } from "@/server/auth/request-session";
import { AdminReportImagesService } from "@/server/services/admin-report-images-service";

export type ReportImagesState = { error?: string; saved?: boolean };
function refreshReports() {
  revalidatePath("/admin");
  revalidatePath("/api/public/content");
  revalidatePath("/reports", "layout");
}
export async function removeReportImagesAction(_state: ReportImagesState, form: FormData): Promise<ReportImagesState> {
  const admin = await requireCurrentAdmin();
  try {
    await new AdminReportImagesService().remove({ reportCardId: String(form.get("reportCardId") ?? ""),
      assetId: String(form.get("assetId") ?? ""), revision: String(form.get("revision") ?? "") }, admin.id);
    refreshReports();
    return { saved: true };
  } catch (error) { return { error: error instanceof Error ? error.message : "移除未完成，请稍后重试。" }; }
}
