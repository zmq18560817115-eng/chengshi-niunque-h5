const { requireAdmin, publish, revalidate } = vi.hoisted(() => ({ requireAdmin: vi.fn(), publish: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/server/auth/request-session", () => ({ requireCurrentAdmin: requireAdmin }));
vi.mock("@/server/services/latest-batch-service", () => ({ LatestBatchService: class { publish = publish; } }));
vi.mock("next/cache", () => ({ revalidatePath: revalidate }));
import { publishLatestBatchAction } from "@/app/admin/actions";

describe("batch publishing action", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it("rejects an unauthenticated save before reading or updating settings", async () => {
    requireAdmin.mockRejectedValueOnce(new Error("login required"));
    await expect(publishLatestBatchAction({}, new FormData())).rejects.toThrow("login required");
    expect(publish).not.toHaveBeenCalled();
  });
  it("publishes with the authenticated operator and refreshes both entry and homepage", async () => {
    requireAdmin.mockResolvedValueOnce({ id: "operator" });
    const value = { regularBatch: "BATCH1", trialBatch: "BATCH2", inspectionDate: "2026-09" };
    publish.mockResolvedValueOnce(value);
    const form = new FormData();
    for (const [key, item] of Object.entries(value)) form.set(key, item);
    expect(await publishLatestBatchAction({}, form)).toEqual({ saved: true, value });
    expect(publish).toHaveBeenCalledWith(value, "operator");
    for (const path of ["/go", "/reports", "/admin/site", "/api/public/content"]) expect(revalidate).toHaveBeenCalledWith(path);
  });
  it("keeps the previous published value when validation fails", async () => {
    requireAdmin.mockResolvedValueOnce({ id: "operator" });
    publish.mockRejectedValueOnce(new Error("检测日期无效"));
    const value = { regularBatch: "BATCH1", trialBatch: "BATCH2", inspectionDate: "2026-09" };
    expect(await publishLatestBatchAction({ value }, new FormData())).toEqual({ error: "检测日期无效", value });
    expect(revalidate).not.toHaveBeenCalled();
  });
});
