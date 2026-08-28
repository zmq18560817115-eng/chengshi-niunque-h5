"use client";

import { AdaptiveReadinessGate } from "@/components/h5/AdaptiveReadinessGate";
import { BrandGuide, guideWarmAssets } from "@/components/h5/BrandGuide";
import type { HomepageAssetRequest } from "@/components/h5/homepage-preload";
import { useVisualViewportHeight } from "@/components/h5/useVisualViewportHeight";

const guideReadinessRequests: readonly HomepageAssetRequest[] = guideWarmAssets.map((src) => ({ src, priority: "high" as const }));
export function GuideExperience() {
  useVisualViewportHeight();

  return <AdaptiveReadinessGate requests={guideReadinessRequests} label="正在准备品牌引导" reason="guide-assets" revealDelayMs={600}>
    <BrandGuide/>
  </AdaptiveReadinessGate>;
}
