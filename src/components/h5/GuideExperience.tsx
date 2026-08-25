"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { archiveArtworkWarmAssets } from "@/components/h5/ArchiveArtwork";
import { BrandGuide, guideWarmAssets } from "@/components/h5/BrandGuide";
import { archiveFishWarmAssets } from "@/components/h5/motion/modules/ArchiveFishFloatMotion";
import { archiveSectionTitleWarmAssets } from "@/components/h5/motion/modules/ArchiveSectionTitleMotion";
import { archiveStoryWarmAssets } from "@/components/h5/motion/modules/ArchiveStoryCopyMotion";
import { archiveUnlockWarmAssets } from "@/components/h5/motion/modules/ArchiveUnlockTabMotion";
import { preloadHomepageAssets, type HomepageAssetRequest } from "@/components/h5/homepage-preload";

type LoadingPhase = "loading" | "leaving" | "ready";
type BufferAssetState = "loading" | "ready" | "failed";

const loadingGifDurationMs = 3600;
const reducedLoadingDurationMs = 600;
const loadingExitDurationMs = 260;
const publicDataWarmupTimeoutMs = 12000;
const bufferAssetTimeoutMs = 12000;
const experienceWarmRequests: readonly HomepageAssetRequest[] = [
  ...guideWarmAssets.map((src) => ({ src, priority: "high" as const })),
  ...archiveArtworkWarmAssets.map((src) => ({ src, priority: "high" as const })),
  ...archiveUnlockWarmAssets.map((src) => ({ src, priority: "auto" as const })),
  ...archiveFishWarmAssets.map((src) => ({ src, priority: "auto" as const })),
  ...archiveStoryWarmAssets.map((src) => ({ src, priority: "auto" as const })),
  ...archiveSectionTitleWarmAssets.map((src) => ({ src, priority: "auto" as const })),
];

export function GuideExperience() {
  const router = useRouter();
  const [phase, setPhase] = useState<LoadingPhase>("loading");
  const [bufferAssetState, setBufferAssetState] = useState<BufferAssetState>("loading");
  const [warmupComplete, setWarmupComplete] = useState(false);
  const [warmupFailedAssets, setWarmupFailedAssets] = useState(0);
  const [bufferPlaybackComplete, setBufferPlaybackComplete] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    let publicDataTimeout = 0;
    router.prefetch("/reports");

    const publicContent = fetch("/api/public/content", {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    }).then((response) => {
      if (!response.ok) throw new Error("PUBLIC_CONTENT_UNAVAILABLE");
      return response.json();
    });
    const experienceArtwork = preloadHomepageAssets(experienceWarmRequests).then((result) => {
      if (result.failed.length > 0) console.error(`[GuideExperience] homepage assets failed: ${result.failed.join(", ")}`);
      if (!cancelled) setWarmupFailedAssets(result.failed.length);
      router.prefetch("/reports");
    });
    const publicDataFallback = new Promise<void>((resolve) => {
      publicDataTimeout = window.setTimeout(resolve, publicDataWarmupTimeoutMs);
    });

    void Promise.all([Promise.race([publicContent.then(() => undefined).catch(() => undefined), publicDataFallback]), experienceArtwork]).then(() => {
      if (!cancelled) setWarmupComplete(true);
    });

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(publicDataTimeout);
    };
  }, [router]);

  useEffect(() => {
    if (bufferAssetState === "loading") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const duration = bufferAssetState === "failed" || reduced ? reducedLoadingDurationMs : loadingGifDurationMs;
    const timer = window.setTimeout(() => setBufferPlaybackComplete(true), duration);
    return () => window.clearTimeout(timer);
  }, [bufferAssetState]);

  useEffect(() => {
    if (phase !== "loading" || !warmupComplete || !bufferPlaybackComplete) return;
    setPhase("leaving");
  }, [bufferPlaybackComplete, phase, warmupComplete]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const timer = window.setTimeout(() => setPhase("ready"), loadingExitDurationMs);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (bufferAssetState !== "loading") return;
    const timer = window.setTimeout(() => setBufferAssetState("failed"), bufferAssetTimeoutMs);
    return () => window.clearTimeout(timer);
  }, [bufferAssetState]);

  if (phase === "ready") return <BrandGuide />;

  return (
    <main
      className={`guide-loading-buffer is-${phase}`}
      data-buffer-asset-state={bufferAssetState}
      data-buffer-warmup-state={warmupComplete ? "ready" : "loading"}
      data-buffer-assets-total={experienceWarmRequests.length}
      data-buffer-assets-failed={warmupFailedAssets}
      aria-label="营养信息加载"
    >
      <section className="guide-loading-buffer-stage" aria-live="polite" aria-busy={phase === "loading"}>
        <Image
          className="guide-loading-buffer-poster"
          src="/design/guide/data-loading-buffer-poster.webp"
          alt=""
          fill
          sizes="(max-width: 750px) 100vw, 750px"
          priority
          unoptimized
        />
        <Image
          className="guide-loading-buffer-gif"
          src="/design/guide/data-loading-buffer.gif"
          alt="正在公开你的营养信息"
          fill
          sizes="(max-width: 750px) 100vw, 750px"
          priority
          fetchPriority="high"
          unoptimized
          onLoad={() => setBufferAssetState("ready")}
          onError={() => setBufferAssetState("failed")}
        />
        <span className="sr-only">正在加载网页数据与营养档案</span>
      </section>
    </main>
  );
}
