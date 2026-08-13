import { categoryCardLayouts, defaultCategoryTheme, getCategoryTheme } from "@/config/h5-category-themes";

describe("H5 category report themes", () => {
  it.each([
    ["inspection-projects", "inspection", "report-page--inspection"],
    ["review-assurance", "review", "report-page--review"],
    ["production-traceability", "traceability", "report-page--traceability"],
  ])("maps %s to its fixed theme", (slug, theme, backgroundClass) => {
    expect(getCategoryTheme(slug)).toMatchObject({ theme, backgroundClass });
  });

  it("uses a safe default for unknown slugs", () => {
    expect(getCategoryTheme("unknown-category")).toEqual(defaultCategoryTheme);
  });

  it.each([
    ["inspection-projects", "category-inspection-clean.webp"],
    ["review-assurance", "category-review-clean.webp"],
    ["production-traceability", "category-traceability-clean.webp"],
  ])("uses an artwork with blank business-content cards for %s", (slug, artwork) => {
    expect(getCategoryTheme(slug)).toMatchObject({ artwork });
  });

  it("uses per-card master coordinates instead of forcing the third card copy upward", () => {
    expect(categoryCardLayouts["inspection-projects"].map((card) => card.contentY)).toEqual([65, 65, 92]);
    expect(categoryCardLayouts["review-assurance"].map((card) => card.contentY)).toEqual([65, 65, 92]);
    expect(categoryCardLayouts["production-traceability"].map((card) => card.contentY)).toEqual([65, 65]);
  });
});
