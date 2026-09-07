import { h5FixedContent } from "@/config/h5-fixed-content";
import { defaultLatestBatch, resolveLatestBatch } from "@/config/h5-latest-batch";

export const defaultH5SiteConfig = { ...h5FixedContent, guideDelaySeconds: 0, latestBatch: defaultLatestBatch };
export type H5SiteConfig = typeof defaultH5SiteConfig;

/** Only the approved batch fields are editable; all other visual copy stays fixed. */
export function resolveH5SiteConfig(value: unknown): H5SiteConfig {
  return { ...defaultH5SiteConfig, latestBatch: resolveLatestBatch(value) };
}
