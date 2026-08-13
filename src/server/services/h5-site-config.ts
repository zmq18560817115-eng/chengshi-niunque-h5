import { h5FixedContent } from "@/config/h5-fixed-content";

export const defaultH5SiteConfig = { ...h5FixedContent, guideDelaySeconds: 0 };
export type H5SiteConfig = typeof defaultH5SiteConfig;

/** Persisted SiteSetting values are intentionally ignored; visual copy is fixed in code. */
export function resolveH5SiteConfig(_value: unknown): H5SiteConfig {
  void _value;
  return defaultH5SiteConfig;
}
