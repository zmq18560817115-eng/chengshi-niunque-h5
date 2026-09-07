"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BrandGuide } from "@/components/h5/BrandGuide";
import { useVisualViewportHeight } from "@/components/h5/useVisualViewportHeight";
import { defaultLatestBatch, type LatestBatch } from "@/config/h5-latest-batch";

export function GuideExperience({ latestBatch = defaultLatestBatch }: { latestBatch?: LatestBatch }) {
  const router = useRouter();
  useVisualViewportHeight();

  useEffect(() => {
    router.prefetch("/reports");
  }, [router]);

  return <BrandGuide latestBatch={latestBatch}/>;
}
