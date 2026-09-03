const mocks = vi.hoisted(() => ({
  assetQuery: vi.fn(),
  pageQuery: vi.fn(),
  read: vi.fn(),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    reportAsset: { findFirst: mocks.assetQuery },
    reportAssetPage: { findFirst: mocks.pageQuery },
  },
}));
vi.mock("@/server/storage", () => ({
  getObjectStorage: () => ({ read: mocks.read }),
}));

import { GET as getAssetImage } from "@/app/reports/image/[assetId]/route";
import { GET as getPageImage } from "@/app/reports/image/page/[pageId]/route";

const publicRecordParents = {
  id: "asset",
  title: "批次检测报告",
  description: null,
  reportCard: {
    id: "card",
    title: "营养检测",
    description: null,
    module: { id: "module", title: "检测项目", description: null },
  },
};

describe("public report image routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a retryable 503 when the database is unavailable", async () => {
    mocks.assetQuery.mockRejectedValue(new Error("database unavailable"));
    const response = await getAssetImage(
      new Request("http://localhost/reports/image/asset"),
      { params: Promise.resolve({ assetId: "asset" }) },
    );
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("3");
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it("returns not found for a missing object and 503 for a transient storage failure", async () => {
    mocks.assetQuery.mockResolvedValue({ ...publicRecordParents, storageKey: "reports/report.png", mimeType: "image/png" });
    mocks.read.mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(getAssetImage(
      new Request("http://localhost/reports/image/asset"),
      { params: Promise.resolve({ assetId: "asset" }) },
    )).rejects.toThrow("NEXT_NOT_FOUND");

    mocks.read.mockRejectedValueOnce(new Error("storage unavailable"));
    const unavailable = await getAssetImage(
      new Request("http://localhost/reports/image/asset"),
      { params: Promise.resolve({ assetId: "asset" }) },
    );
    expect(unavailable.status).toBe(503);
  });

  it("proxies a valid page image with conditional cache headers", async () => {
    mocks.pageQuery.mockResolvedValue({ storageKey: "reports/page.webp", mimeType: "image/webp", reportAsset: publicRecordParents });
    mocks.read.mockResolvedValue(new Response("image", { status: 200, headers: { etag: "page-etag" } }));
    const response = await getPageImage(
      new Request("http://localhost/reports/image/page/page", { headers: { "If-None-Match": "page-etag" } }),
      { params: Promise.resolve({ pageId: "page" }) },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toBe("private, no-cache, must-revalidate");
    expect(mocks.read).toHaveBeenCalledWith("reports/page.webp", expect.objectContaining({ ifNoneMatch: "page-etag" }));
    await response.body?.cancel();
  });

  it("rejects legacy GIF or mismatched extensions before touching storage", async () => {
    mocks.pageQuery.mockResolvedValue({ storageKey: "reports/page.gif", mimeType: "image/gif", reportAsset: publicRecordParents });
    await expect(getPageImage(
      new Request("http://localhost/reports/image/page/page"),
      { params: Promise.resolve({ pageId: "page" }) },
    )).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it("does not expose a directly addressed integration asset", async () => {
    mocks.assetQuery.mockResolvedValue({
      ...publicRecordParents,
      title: "联调资料一",
      storageKey: "reports/integration.png",
      mimeType: "image/png",
    });
    await expect(getAssetImage(
      new Request("http://localhost/reports/image/asset"),
      { params: Promise.resolve({ assetId: "asset" }) },
    )).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.read).not.toHaveBeenCalled();
  });
});
