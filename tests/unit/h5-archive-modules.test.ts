import { getArchiveModuleLayout } from "@/config/h5-archive-modules";

describe("archive module visual mapping", () => {
  it("keeps the three artwork layers mapped to their matching routes", () => {
    expect(getArchiveModuleLayout("inspection-projects")).toMatchObject({ order: 0, left: "43%", top: "48.4%", label: "检测项目" });
    expect(getArchiveModuleLayout("review-assurance")).toMatchObject({ order: 1, left: "4%", top: "58.2%", label: "复核保障" });
    expect(getArchiveModuleLayout("production-traceability")).toMatchObject({ order: 2, left: "43%", top: "62%", label: "生产溯源" });
  });

  it("does not invent a visual slot for an unknown module", () => {
    expect(getArchiveModuleLayout("unknown-module")).toBeUndefined();
  });
});
