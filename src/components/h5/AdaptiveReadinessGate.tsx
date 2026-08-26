"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { preloadHomepageAssets, type HomepageAssetRequest } from "@/components/h5/homepage-preload";
import { RuntimeLoadingBuffer, type RuntimeLoadingPhase } from "@/components/h5/RuntimeLoadingBuffer";

type ReadinessPhase = RuntimeLoadingPhase | "waiting" | "ready";

const loadingExitDurationMs = 260;
export const adaptiveLoadingRevealDelayMs = 220;
const AdaptiveReadinessContext = createContext(true);

const nextPaintFrame = () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

async function settleRenderedContent(selector: string, frameCount: number) {
  let root: Element | null = null;
  for (let frame = 0; frame < 120 && !root; frame += 1) {
    root = document.querySelector(selector);
    if (!root) await nextPaintFrame();
  }
  if (!root) return;

  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const images = [...root.querySelectorAll<HTMLImageElement>("img")].filter((image) => {
    const rect = image.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom >= -viewportHeight * .25 && rect.top <= viewportHeight * 1.5;
  });
  await Promise.all(images.map(async (image) => {
    if (!image.complete) {
      await new Promise<void>((resolve) => {
        const finish = () => resolve();
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
        if (image.complete) resolve();
      });
    }
    if (image.naturalWidth > 0 && typeof image.decode === "function") await image.decode().catch(() => undefined);
  }));
  await document.fonts?.ready?.catch(() => undefined);
  for (let frame = 0; frame < frameCount; frame += 1) await nextPaintFrame();
}

export function useAdaptiveReadiness() {
  return useContext(AdaptiveReadinessContext);
}

export function AdaptiveReadinessGate({
  requests,
  children,
  label = "正在准备页面内容",
  reason = "assets",
  mountChildrenWhileLoading = true,
  revealDelayMs = adaptiveLoadingRevealDelayMs,
  settleSelector,
  settleFrames = 3,
}: {
  requests: readonly HomepageAssetRequest[];
  children: ReactNode;
  label?: string;
  reason?: string;
  mountChildrenWhileLoading?: boolean;
  revealDelayMs?: number;
  settleSelector?: string;
  settleFrames?: number;
}) {
  const [phase, setPhase] = useState<ReadinessPhase>("waiting");
  const loadingVisible = useRef(false);
  const requestKey = useMemo(() => requests.map(({ src, priority = "auto" }) => `${priority}:${src}`).join("|"), [requests]);

  useEffect(() => {
    let cancelled = false;
    loadingVisible.current = false;
    setPhase("waiting");
    const revealTimer = window.setTimeout(() => {
      if (cancelled) return;
      loadingVisible.current = true;
      setPhase("loading");
    }, revealDelayMs);
    void preloadHomepageAssets(requests).then(async (result) => {
      if (result.failed.length > 0) console.error(`[AdaptiveReadinessGate] assets failed: ${result.failed.join(", ")}`);
      if (cancelled) return;
      if (settleSelector) await settleRenderedContent(settleSelector, settleFrames);
      if (cancelled) return;
      window.clearTimeout(revealTimer);
      setPhase(loadingVisible.current ? "leaving" : "ready");
    });
    return () => {
      cancelled = true;
      window.clearTimeout(revealTimer);
    };
  }, [requestKey, requests, revealDelayMs, settleFrames, settleSelector]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const timer = window.setTimeout(() => setPhase("ready"), loadingExitDurationMs);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const contentReady = phase === "leaving" || phase === "ready";
  if (phase === "ready") return <AdaptiveReadinessContext.Provider value>{children}</AdaptiveReadinessContext.Provider>;
  return <>
    {mountChildrenWhileLoading || contentReady ? <AdaptiveReadinessContext.Provider value={contentReady}>{children}</AdaptiveReadinessContext.Provider> : null}
    {phase === "loading" || phase === "leaving" ? <RuntimeLoadingBuffer phase={phase} label={label} reason={reason}/> : null}
  </>;
}
