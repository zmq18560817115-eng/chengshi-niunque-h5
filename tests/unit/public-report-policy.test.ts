import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { isProductionPublicRecord, isReservedPlaceholderCardId, isRetiredPublicTestAssetPath } from "@/server/public-report-policy";

describe("public report policy", () => {
  it.each([
    "placeholder-slot-1",
    "placeholder-slot-3",
    "placeholder-slot-arbitrary",
  ])("reserves former predictable card id %s", (cardId) => {
    expect(isReservedPlaceholderCardId(cardId)).toBe(true);
  });

  it("does not confuse a real card id containing a similar word", () => {
    expect(isReservedPlaceholderCardId("nutrition-placeholder-slot-1")).toBe(false);
  });

  it("retires the old bundled test-report URLs without blocking ordinary design assets", () => {
    expect(isRetiredPublicTestAssetPath("/design/reports/test-report-5.webp")).toBe(true);
    expect(isRetiredPublicTestAssetPath("/design/reports/published-report.webp")).toBe(false);
    const response = middleware(new NextRequest("http://localhost/design/reports/test-report-1.webp"));
    expect(response.status).toBe(404);
  });

  it.each([
    { id: "seed-asset-pdf", title: "营养成分报告" },
    { id: "asset-1", title: "联调资料一" },
    { id: "asset-2", title: "第三方测试资料" },
    { id: "acceptance-created", title: "公开报告" },
  ])("filters a known non-production record without deleting it: $id", (record) => {
    expect(isProductionPublicRecord(record)).toBe(false);
  });

  it("keeps ordinary detection copy public", () => {
    expect(isProductionPublicRecord({ id: "real-report", title: "营养成分检测报告", description: "当前批次检测结果" })).toBe(true);
  });

  it("returns an HTTP 404 before the report page can stream a placeholder", () => {
    const response = middleware(new NextRequest("http://localhost/reports/inspection-projects/items/placeholder-slot-1/reports"));
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("passes a normal report route through", () => {
    const response = middleware(new NextRequest("http://localhost/reports/inspection-projects/items/real-card/reports"));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
