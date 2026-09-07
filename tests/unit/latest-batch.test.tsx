import { render } from "@testing-library/react";
import { defaultLatestBatch, formatInspectionDate, isInspectionDate, latestBatchSettingKey, resolveLatestBatch } from "@/config/h5-latest-batch";
import { validateLatestBatch } from "@/server/services/latest-batch-service";
import { publicSiteConfig } from "@/server/services/public-content-service";
import { ArchiveArtwork } from "@/components/h5/ArchiveArtwork";
import { createArchiveEntryTransitionVisual } from "@/components/h5/archive-entry-transition-visual";

const edited = { regularBatch: "GD00049001", trialBatch: "GD00049002", inspectionDate: "2026-09-07" };

describe("editable latest public batch", () => {
  it("accepts month/day precision and rejects impossible calendar dates", () => {
    expect(isInspectionDate("2028-02-29")).toBe(true);
    for (const value of ["2026-02-29", "2026-04-31", "2026-00", "2026-13", "2026-9", "<script>", "2026-09-00"]) expect(isInspectionDate(value)).toBe(false);
    expect(formatInspectionDate("2026-09")).toBe("2026年9月");
    expect(formatInspectionDate(edited.inspectionDate)).toBe("2026年9月7日");
  });
  it("validates all fields before publishing and never accepts arbitrary homepage fields", () => {
    expect(validateLatestBatch({ ...edited, regularBatch: " GD00049001 ", archiveTitle: "changed" })).toEqual(edited);
    for (const regularBatch of ["", "A".repeat(25), "<img>", "batch with spaces"]) expect(() => validateLatestBatch({ ...edited, regularBatch })).toThrow(/正装批次号/);
    expect(() => validateLatestBatch({ ...edited, trialBatch: "" })).toThrow(/试用装批次号/);
    expect(() => validateLatestBatch({ ...edited, inspectionDate: "2026-02-30" })).toThrow(/检测日期/);
    expect(resolveLatestBatch(null)).toEqual(defaultLatestBatch);
  });
  it("reads only the approved published setting key and preserves the fixed title", () => {
    const config = publicSiteConfig({ version: "1", modules: [], settings: [{ key: "h5-site", name: "legacy", value: { archiveTitle: "legacy", ...edited } }, { key: latestBatchSettingKey, name: "batch", value: { ...edited, archiveTitle: "changed" } }] });
    expect(config.latestBatch).toEqual(edited);
    expect(config.archiveTitle).toBe("诚实透明档案");
  });
  it("preserves the exact default assets and uses matching custom text in live and handoff groups", () => {
    const { container, rerender } = render(<ArchiveArtwork preview/>);
    expect(container.querySelector('[data-source-part="module-1-batch-0"]')).toHaveAttribute("src", "/design/2026-09-07/runtime/archive-1-batch-module.webp");
    expect(container.querySelector(".archive-batch-values")).toBeNull();
    rerender(<ArchiveArtwork preview latestBatch={edited}/>);
    expect(container.querySelector('[data-source-part="module-1-batch-0"]')).toHaveAttribute("src", "/design/2026-09-07/runtime/archive-batch-editable.webp");
    const handoff = createArchiveEntryTransitionVisual(undefined, edited);
    for (const root of [container, handoff.visual]) {
      expect(root.querySelector('[data-batch-field="regularBatch"]')).toHaveTextContent(edited.regularBatch);
      expect(root.querySelector('[data-batch-field="trialBatch"]')).toHaveTextContent(edited.trialBatch);
      expect(root.querySelector('[data-batch-field="inspectionDate"]')).toHaveTextContent("2026年9月7日");
    }
  });
});
