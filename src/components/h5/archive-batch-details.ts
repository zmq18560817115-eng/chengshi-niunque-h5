import { defaultLatestBatch, formatInspectionDate, isDefaultLatestBatch, type LatestBatch } from "@/config/h5-latest-batch";
import { designAssets } from "@/config/design-assets.generated";

export function batchArtworkSource(src: string, value: LatestBatch = defaultLatestBatch) {
  return isDefaultLatestBatch(value) ? src : designAssets.archiveBatchEditable;
}
export function archiveFallbackSource(value: LatestBatch) {
  return isDefaultLatestBatch(value) ? designAssets.archiveFallback : designAssets.archiveFallbackEditable;
}
export function batchValueFields(value: LatestBatch) {
  const date = formatInspectionDate(value.inspectionDate);
  return [
    { key: "regularBatch", text: value.regularBatch, x: 272, y: 2906, width: Math.min(363, value.regularBatch.length * 30.8) },
    { key: "trialBatch", text: value.trialBatch, x: 330, y: 2970, width: Math.min(307, value.trialBatch.length * 30.5) },
    { key: "inspectionDate", text: date, x: 746, y: 2906, width: Math.min(310, 245 + (date.length - 7) * 28) },
  ];
}

export function createBatchDetails(value: LatestBatch) {
  if (isDefaultLatestBatch(value)) return null;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${designAssets.archiveWidth} ${designAssets.archiveHeight}`);
  svg.setAttribute("class", "archive-batch-values");
  svg.setAttribute("aria-hidden", "true");
  for (const field of batchValueFields(value)) {
    const text = document.createElementNS(ns, "text");
    text.setAttribute("x", String(field.x));
    text.setAttribute("y", String(field.y + 51));
    text.setAttribute("textLength", String(field.width));
    text.setAttribute("lengthAdjust", "spacingAndGlyphs");
    text.setAttribute("data-batch-field", field.key);
    text.textContent = field.text;
    svg.append(text);
  }
  return svg;
}
