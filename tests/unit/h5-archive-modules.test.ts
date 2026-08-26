import { getArchiveModuleLayout } from "@/config/h5-archive-modules";

describe("archive module visual mapping", () => {
  it("keeps the three artwork layers mapped to their matching routes", () => {
    expect(getArchiveModuleLayout("inspection-projects")).toMatchObject({ order: 0, left: "0%", top: "49.406154%", width: "100%", height: "6.84722%", label: "检测项目" });
    expect(getArchiveModuleLayout("review-assurance")).toMatchObject({ order: 1, left: "0%", top: "56.253374%", width: "100%", height: "6.415332%", label: "复核保障" });
    expect(getArchiveModuleLayout("production-traceability")).toMatchObject({ order: 2, left: "0%", top: "62.668706%", width: "100%", height: "16.051827%", label: "生产溯源" });
  });

  it("does not invent a visual slot for an unknown module", () => {
    expect(getArchiveModuleLayout("unknown-module")).toBeUndefined();
  });

  it("keeps the review and production navigation regions disjoint", () => {
    const review = getArchiveModuleLayout("review-assurance")!;
    const production = getArchiveModuleLayout("production-traceability")!;
    const reviewBottom = Number.parseFloat(review.top) + Number.parseFloat(review.height);
    expect(reviewBottom).toBeLessThanOrEqual(Number.parseFloat(production.top));
  });

  it("covers each complete coloured folder band with one consistent full-width hit region", () => {
    const regions = ["inspection-projects", "review-assurance", "production-traceability"].map((slug) => getArchiveModuleLayout(slug)!);
    expect(regions.every((region) => region.left === "0%" && region.width === "100%")).toBe(true);
    for (let index = 0; index < regions.length - 1; index += 1) {
      const bottom = Number.parseFloat(regions[index].top) + Number.parseFloat(regions[index].height);
      expect(bottom).toBeCloseTo(Number.parseFloat(regions[index + 1].top), 2);
    }
  });
});
