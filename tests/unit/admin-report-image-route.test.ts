const { admin, findAsset, read } = vi.hoisted(() => ({ admin: vi.fn(), findAsset: vi.fn(), read: vi.fn() }));
vi.mock("@/server/auth/request-session", () => ({ getCurrentAdmin: admin }));
vi.mock("@/server/db/prisma", () => ({ prisma: { reportAsset: { findFirst: findAsset } } }));
vi.mock("@/server/storage", () => ({ getObjectStorage: () => ({ read }) }));
import { GET } from "@/app/api/admin/report-images/[assetId]/route";

describe("private admin image preview", () => {
  const request = (pageId: string) => GET(new Request(`http://localhost/api/admin/report-images/real-asset?pageId=${pageId}`), { params: Promise.resolve({ assetId: "real-asset" }) });
  beforeEach(() => {
    vi.clearAllMocks(); admin.mockResolvedValue({ id: "operator" });
    findAsset.mockResolvedValue({ id: "real-asset", title: "正式报告", description: null,
      pages: [{ id: "page-one", storageKey: "reports/private.png", mimeType: "image/png" }],
      reportCard: { id: "seed-card-inspection-safety", deletedAt: null, module: { slug: "inspection-projects", deletedAt: null } } });
  });
  it("requires login before looking up images", async () => {
    admin.mockResolvedValue(null);
    expect((await request("page-one")).status).toBe(401);
    expect(findAsset).not.toHaveBeenCalled(); expect(read).not.toHaveBeenCalled();
  });
  it("never exposes a page belonging to another report", async () => {
    expect((await request("another-page")).status).toBe(404);
    expect(read).not.toHaveBeenCalled();
  });
  it("serves the selected image through storage with private no-store caching", async () => {
    read.mockResolvedValue(new Response(new Uint8Array([1, 2]), { headers: { "content-type": "image/png" } }));
    const response = await request("page-one");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(read).toHaveBeenCalledWith("reports/private.png");
  });
});
