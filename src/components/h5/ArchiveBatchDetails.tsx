import { designAssets } from "@/config/design-assets.generated";
import { isDefaultLatestBatch, type LatestBatch } from "@/config/h5-latest-batch";
import { batchValueFields } from "./archive-batch-details";

export function ArchiveBatchDetails({ value }: { value: LatestBatch }) {
  if (isDefaultLatestBatch(value)) return null;
  return <svg className="archive-batch-values" viewBox={`0 0 ${designAssets.archiveWidth} ${designAssets.archiveHeight}`} aria-hidden="true">
    {batchValueFields(value).map((field) => <text key={field.key} data-batch-field={field.key} x={field.x} y={field.y + 51} textLength={field.width} lengthAdjust="spacingAndGlyphs">{field.text}</text>)}
  </svg>;
}
