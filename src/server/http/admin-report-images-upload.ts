import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/server/auth/request-session";
import { AdminReportImagesService } from "@/server/services/admin-report-images-service";

export async function uploadReportImages(request: Request): Promise<Response> {
  const headers = { "Cache-Control": "private, no-store" };
  const admin = await getCurrentAdmin();
  if (!admin) return Response.json({ error: "登录已过期，请重新登录后上传。" }, { status: 401, headers });

  // A non-simple header requires a CORS preflight for cross-origin requests.
  // This private endpoint intentionally does not enable CORS.
  if (request.headers.get("X-Report-Upload") !== "1" || request.headers.get("Sec-Fetch-Site") === "cross-site") {
    return Response.json({ error: "请从管理页面上传报告图片。" }, { status: 403, headers });
  }
  try {
    // Route handlers avoid the Server Action body-size ceiling. Keep file
    // validation and publication in the existing storage/Prisma service.
    const form = await request.formData();
    await new AdminReportImagesService().publish({
      reportCardId: String(form.get("reportCardId") ?? ""),
      assetId: String(form.get("assetId") ?? "") || undefined,
      revision: String(form.get("revision") ?? ""),
      files: form.getAll("files").filter((file): file is File => typeof file !== "string" && file.size > 0),
    }, admin.id);
    revalidatePath("/admin");
    revalidatePath("/api/public/content");
    revalidatePath("/reports", "layout");
    return Response.json({ saved: true }, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "上传未完成，请稍后重试。" }, { status: 400, headers });
  }
}
