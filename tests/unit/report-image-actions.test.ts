const { admin, publish, remove, revalidate } = vi.hoisted(() => ({ admin: vi.fn(), publish: vi.fn(), remove: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/server/auth/request-session", () => ({ requireCurrentAdmin: admin }));
vi.mock("@/server/services/admin-report-images-service", () => ({ AdminReportImagesService: class { publish = publish; remove = remove; } }));
vi.mock("next/cache", () => ({ revalidatePath: revalidate }));
import { removeReportImagesAction } from "@/app/admin/report-image-actions";
import * as legacy from "@/app/admin/actions";

describe("scoped admin report actions", () => {
  beforeEach(() => { vi.clearAllMocks(); admin.mockResolvedValue({ id: "operator" }); });
  it("requires authentication before image writes", async () => {
    admin.mockRejectedValue(new Error("login required"));
    await expect(removeReportImagesAction({}, new FormData())).rejects.toThrow("login required");
    expect(publish).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled();
  });
  it("removes only the selected report and refreshes public content", async () => {
    const form = new FormData();
    form.set("reportCardId", "card"); form.set("assetId", "asset"); form.set("revision", "revision");
    form.set("title", "tampered"); form.set("status", "OFFLINE"); form.set("storageKey", "someone-else.png");
    expect(await removeReportImagesAction({}, form)).toEqual({ saved: true });
    expect(remove).toHaveBeenCalledWith({ reportCardId: "card", assetId: "asset", revision: "revision" }, "operator");
    expect(revalidate).toHaveBeenCalledWith("/reports", "layout");
    expect(revalidate).toHaveBeenCalledWith("/api/public/content");
  });
  it.each(["createModuleAction", "updateModuleAction", "deleteModuleAction", "moveModuleAction", "createCardAction", "updateCardAction", "deleteCardAction", "createAssetAction", "updateAssetAction", "deleteAssetAction", "createAndPublishAssetAction"] as const)("closes the legacy %s mutation", async (name) => {
    await expect(legacy[name]()).rejects.toThrow("分类、文案和页面结构不可修改");
    expect(admin).toHaveBeenCalled();
  });
  it("does not invalidate public content on a failed update", async () => {
    remove.mockRejectedValueOnce(new Error("图片没有移除"));
    expect(await removeReportImagesAction({}, new FormData())).toEqual({ error: "图片没有移除" });
    expect(revalidate).not.toHaveBeenCalled();
  });
});
