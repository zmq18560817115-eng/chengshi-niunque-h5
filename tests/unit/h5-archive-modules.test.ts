import { designAssets } from "@/config/design-assets.generated";
import { getArchiveModuleLayout } from "@/config/h5-archive-modules";

function contains(slug: string, x: number, y: number) {
  const part = designAssets.archiveFolderHotspots.find((item) => item.slug === slug)!;
  const px = (x - part.x) / part.width * 100;
  const py = (y + designAssets.archive2Top - part.y) / part.height * 100;
  const points = part.points;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i], [xj, yj] = points[j];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

describe("archive source-shaped navigation", () => {
  it("maps all three original contours to their corresponding routes", () => {
    const slugs = ["inspection-projects", "review-assurance", "production-traceability"];
    for (const [order, slug] of slugs.entries()) {
      const layout = getArchiveModuleLayout(slug)!;
      expect(layout.order).toBe(order);
      expect(layout.clipPath).toMatch(/^polygon\(/);
      expect(designAssets.archiveFolderHotspots[order].points.length).toBeGreaterThan(20);
    }
    expect(getArchiveModuleLayout("unknown")).toBeUndefined();
  });

  it("includes the coloured tabs and bodies but excludes empty top corners", () => {
    expect(contains("inspection-projects", 1700, 1200)).toBe(true);
    expect(contains("inspection-projects", 100, 1100)).toBe(false);
    expect(contains("inspection-projects", 100, 1500)).toBe(true);
    expect(contains("review-assurance", 500, 1950)).toBe(true);
    expect(contains("review-assurance", 100, 2300)).toBe(true);
    expect(contains("production-traceability", 1500, 2700)).toBe(true);
    expect(contains("production-traceability", 100, 2530)).toBe(false);
    expect(contains("production-traceability", 1000, 3500)).toBe(true);
  });

  it("gives each visible point to at most one folder despite overlapping bounding boxes", () => {
    const slugs = designAssets.archiveFolderHotspots.map((part) => part.slug);
    for (let y = 1060; y < 4241; y += 31) {
      for (let x = 20; x < 2000; x += 37) {
        expect(slugs.filter((slug) => contains(slug, x, y)).length).toBeLessThanOrEqual(1);
      }
    }
  });
});
