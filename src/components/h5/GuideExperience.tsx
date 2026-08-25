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

type LoadingPhase = "loading" | "leaving" | "ready";
type BufferAssetState = "loading" | "ready" | "failed";

const loadingGifDurationMs = 3600;
const reducedLoadingDurationMs = 600;
const loadingExitDurationMs = 260;
const warmupTimeoutMs = 12000;
const experienceWarmAssets = [...new Set([
  ...guideWarmAssets,
  ...archiveArtworkWarmAssets,
  ...archiveUnlockWarmAssets,
  ...archiveFishWarmAssets,
  ...archiveStoryWarmAssets,
  ...archiveSectionTitleWarmAssets,
])];

function preloadImage(src: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new window.Image();
    image.decoding = "async";
    const loaded = new Promise<void>((loadedResolve, loadedReject) => {
      image.onload = () => loadedResolve();
      image.onerror = () => loadedReject(new Error(src));
    });
    image.src = src;
    const decoded = image.decode ? image.decode() : Promise.resolve();
    void Promise.all([loaded, decoded]).then(() => resolve()).catch(() => reject(new Error(src)));
  });
}

export function GuideExperience() {
  const router = useRouter();
  const [phase, setPhase] = useState<LoadingPhase>("loading");
  const [bufferAssetState, setBufferAssetState] = useState<BufferAssetState>("loading");
  const [warmupComplete, setWarmupComplete] = useState(false);
  const [bufferPlaybackComplete, setBufferPlaybackComplete] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    let timeout = 0;
    router.prefetch("/reports");

    const publicContent = fetch("/api/public/content", {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    }).then((response) => {
      if (!response.ok) throw new Error("PUBLIC_CONTENT_UNAVAILABLE");
      return response.json();
    });
    const experienceArtwork = Promise.allSettled(experienceWarmAssets.map(preloadImage));
    const timeoutFallback = new Promise<void>((resolve) => {
      timeout = window.setTimeout(resolve, warmupTimeoutMs);
    });

    void Promise.race([Promise.allSettled([publicContent, experienceArtwork]), timeoutFallback]).then(() => {
      if (!cancelled) setWarmupComplete(true);
    });

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
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
    const timer = window.setTimeout(() => setBufferAssetState("failed"), warmupTimeoutMs);
    return () => window.clearTimeout(timer);
  }, [bufferAssetState]);

  if (phase === "ready") return <BrandGuide />;

  return (
    <main
      className={`guide-loading-buffer is-${phase}`}
      data-buffer-asset-state={bufferAssetState}
      data-buffer-warmup-state={warmupComplete ? "ready" : "loading"}
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
