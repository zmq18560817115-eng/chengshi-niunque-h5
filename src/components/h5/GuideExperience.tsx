"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdaptiveReadinessGate } from "@/components/h5/AdaptiveReadinessGate";
import { archiveArtworkCriticalAssets, archiveArtworkDeferredAssets } from "@/components/h5/ArchiveArtwork";
import { BrandGuide, guideWarmAssets } from "@/components/h5/BrandGuide";
import { archiveFishWarmAssets } from "@/components/h5/motion/modules/ArchiveFishFloatMotion";
import { archiveSectionTitleWarmAssets } from "@/components/h5/motion/modules/ArchiveSectionTitleMotion";
import { archiveStoryWarmAssets } from "@/components/h5/motion/modules/ArchiveStoryCopyMotion";
import { archiveUnlockWarmAssets } from "@/components/h5/motion/modules/ArchiveUnlockTabMotion";
import { preloadHomepageAssets, type HomepageAssetRequest } from "@/components/h5/homepage-preload";

const guideReadinessRequests: readonly HomepageAssetRequest[] = guideWarmAssets.map((src) => ({ src, priority: "high" as const }));
const homepageCriticalWarmRequests: readonly HomepageAssetRequest[] = [
  ...archiveArtworkCriticalAssets.map((src) => ({ src, priority: "auto" as const })),
  ...archiveUnlockWarmAssets.map((src) => ({ src, priority: "auto" as const })),
];
const homepageDeferredWarmRequests: readonly HomepageAssetRequest[] = [
  ...archiveArtworkDeferredAssets.map((src) => ({ src, priority: "low" as const })),
  ...archiveFishWarmAssets.map((src) => ({ src, priority: "low" as const })),
  ...archiveStoryWarmAssets.map((src) => ({ src, priority: "low" as const })),
  ...archiveSectionTitleWarmAssets.map((src) => ({ src, priority: "low" as const })),
];

export function GuideExperience() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/reports");
    void preloadHomepageAssets(homepageCriticalWarmRequests).then((criticalResult) => {
      if (criticalResult.failed.length > 0) console.error(`[GuideExperience] critical homepage assets failed: ${criticalResult.failed.join(", ")}`);
      return preloadHomepageAssets(homepageDeferredWarmRequests);
    }).then((deferredResult) => {
      if (deferredResult.failed.length > 0) console.error(`[GuideExperience] deferred homepage assets failed: ${deferredResult.failed.join(", ")}`);
    });
  }, [router]);

  return <AdaptiveReadinessGate requests={guideReadinessRequests} label="正在准备品牌引导" reason="guide-assets" revealDelayMs={600}>
    <BrandGuide/>
  </AdaptiveReadinessGate>;
}
