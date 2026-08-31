import { describe, expect, it } from "vitest";
import { fourthLevelImageReports, TEST_REPORT_PLACEHOLDERS } from "@/config/h5-test-reports";
import type { PublicAsset } from "@/server/services/public-content-service";

const image: PublicAsset = {
  id: "image-1",
  title: "正式图片报告",
  description: null,
  type: "IMAGE",
  href: "/reports/image/image-1",
  openMode: "same_tab",
  pages: [{ id: "page-1", pageNumber: 1, href: "/reports/image/page/page-1" }],
};

const pdf: PublicAsset = {
  id: "pdf-1",
  title: "原 PDF 报告",
  description: "不应在 H5 产生 PDF 跳转",
  type: "PDF",
  href: "/reports/pdf/pdf-1",
  openMode: "same_tab",
  pages: [],
};

const external: PublicAsset = {
  id: "external-1",
  title: "外部资料",
  description: "不应在 H5 产生外链跳转",
  type: "EXTERNAL_LINK",
  href: "https://example.com/report",
  openMode: "new_tab",
  pages: [],
};

describe("fourthLevelImageReports", () => {
  it("keeps real image reports and replaces every PDF or external item with an image placeholder", () => {
    const reports = fourthLevelImageReports([image, pdf, external]);

    expect(reports).toHaveLength(3);
    expect(reports[0]).toBe(image);
    expect(reports.every((asset) => asset.type === "IMAGE")).toBe(true);
    expect(reports[1]).toMatchObject({ id: "image-placeholder-pdf-1", title: "原 PDF 报告", openMode: "same_tab" });
    expect(reports[2]).toMatchObject({ id: "image-placeholder-external-1", title: "外部资料", openMode: "same_tab" });
    expect(reports.slice(1).flatMap((asset) => asset.pages).every((page) => page.href.startsWith("/design/reports/test-report-"))).toBe(true);
  });

  it("uses the existing image placeholder set when a card has no uploaded reports", () => {
    expect(fourthLevelImageReports([])).toEqual(TEST_REPORT_PLACEHOLDERS);
  });
});
