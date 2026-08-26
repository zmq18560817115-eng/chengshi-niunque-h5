"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdaptiveReadinessGate } from "@/components/h5/AdaptiveReadinessGate";
import { archiveArtworkWarmAssets } from "@/components/h5/ArchiveArtwork";
import { BrandGuide, guideWarmAssets } from "@/components/h5/BrandGuide";
import { archiveFishWarmAssets } from "@/components/h5/motion/modules/ArchiveFishFloatMotion";
import { archiveSectionTitleWarmAssets } from "@/components/h5/motion/modules/ArchiveSectionTitleMotion";
import { archiveStoryWarmAssets } from "@/components/h5/motion/modules/ArchiveStoryCopyMotion";
import { archiveUnlockWarmAssets } from "@/components/h5/motion/modules/ArchiveUnlockTabMotion";
import { preloadHomepageAssets, type HomepageAssetRequest } from "@/components/h5/homepage-preload";

const guideReadinessRequests: readonly HomepageAssetRequest[] = guideWarmAssets.map((src) => ({ src, priority: "high" as const }));
const homepageWarmRequests: readonly HomepageAssetRequest[] = [
  ...archiveArtworkWarmAssets.map((src) => ({ src, priority: "high" as const })),
  ...archiveUnlockWarmAssets.map((src) => ({ src, priority: "auto" as const })),
  ...archiveFishWarmAssets.map((src) => ({ src, priority: "auto" as const })),
  ...archiveStoryWarmAssets.map((src) => ({ src, priority: "auto" as const })),
  ...archiveSectionTitleWarmAssets.map((src) => ({ src, priority: "auto" as const })),
];

export function GuideExperience() {
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    router.prefetch("/reports");

    void fetch("/api/public/content", {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    }).then((response) => {
      if (!response.ok) throw new Error("PUBLIC_CONTENT_UNAVAILABLE");
      return response.json();
    }).catch(() => undefined);
    void preloadHomepageAssets(homepageWarmRequests).then((result) => {
      if (result.failed.length > 0) console.error(`[GuideExperience] homepage assets failed: ${result.failed.join(", ")}`);
      router.prefetch("/reports");
    });

    return () => {
      controller.abort();
    };
  }, [router]);

  return <AdaptiveReadinessGate requests={guideReadinessRequests} label="正在准备品牌引导" reason="guide-assets" mountChildrenWhileLoading={false}>
    <BrandGuide/>
  </AdaptiveReadinessGate>;
}
