"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { preloadHomepageAssets, type HomepageAssetRequest } from "@/components/h5/homepage-preload";
import { RuntimeLoadingBuffer, type RuntimeLoadingPhase } from "@/components/h5/RuntimeLoadingBuffer";

type ReadinessPhase = RuntimeLoadingPhase | "waiting" | "ready";

const loadingExitDurationMs = 260;
export const adaptiveLoadingRevealDelayMs = 220;
export const adaptiveFailOpenDelayMs = 3000;
const AdaptiveReadinessContext = createContext(true);
const AdaptiveReadinessFailureContext = createContext(false);

const nextPaintFrame = () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

async function settleRenderedContent(selector: string, frameCount: number) {
  let root: Element | null = null;
  for (let frame = 0; frame < 120 && !root; frame += 1) {
    root = document.querySelector(selector);
    if (!root) await nextPaintFrame();
  }
  if (!root) return false;

  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const images = [...root.querySelectorAll<HTMLImageElement>("img")].filter((image) => {
    if (image.closest(".reports-archive-reference-fallback")) return false;
    const rect = image.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom >= -viewportHeight * .25 && rect.top <= viewportHeight * 1.08;
  });
  const decoded = await Promise.all(images.map(async (image) => {
    if (!image.complete) {
      await new Promise<void>((resolve) => {
        const finish = () => resolve();
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
        if (image.complete) resolve();
      });
    }
    if (image.naturalWidth <= 0) return false;
    if (typeof image.decode === "function") {
      try {
        await image.decode();
      } catch {
        return false;
      }
    }
    return true;
  }));
  if (decoded.some((ready) => !ready)) return false;
  await document.fonts?.ready?.catch(() => undefined);
  for (let frame = 0; frame < frameCount; frame += 1) await nextPaintFrame();
  return true;
}

export function useAdaptiveReadiness() {
  return useContext(AdaptiveReadinessContext);
}

export function useAdaptiveReadinessFailed() {
  return useContext(AdaptiveReadinessFailureContext);
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
  failOpen = false,
  failOpenAfterMs = adaptiveFailOpenDelayMs,
}: {
  requests: readonly HomepageAssetRequest[];
  children: ReactNode;
  label?: string;
  reason?: string;
  mountChildrenWhileLoading?: boolean;
  revealDelayMs?: number;
  settleSelector?: string;
  settleFrames?: number;
  failOpen?: boolean;
  failOpenAfterMs?: number;
}) {
  const [phase, setPhase] = useState<ReadinessPhase>("waiting");
  const loadingVisible = useRef(false);
  const requestKey = useMemo(() => requests.map(({ src, priority = "auto" }) => `${priority}:${src}`).join("|"), [requests]);

  useEffect(() => {
    let cancelled = false;
    let failedOpen = false;
    loadingVisible.current = false;
    setPhase("waiting");
    const revealTimer = window.setTimeout(() => {
      if (cancelled) return;
      loadingVisible.current = true;
      setPhase("loading");
    }, revealDelayMs);
    const failOpenTimer = failOpen ? window.setTimeout(() => {
      if (cancelled) return;
      failedOpen = true;
      window.clearTimeout(revealTimer);
      setPhase("failed");
    }, failOpenAfterMs) : 0;
    void preloadHomepageAssets(requests).then(async (result) => {
      if (cancelled || failedOpen) return;
      if (result.failed.length > 0) {
        console.error(`[AdaptiveReadinessGate] assets failed: ${result.failed.join(", ")}`);
        window.clearTimeout(revealTimer);
        window.clearTimeout(failOpenTimer);
        setPhase("failed");
        return;
      }
      if (settleSelector && !(await settleRenderedContent(settleSelector, settleFrames))) {
        if (!cancelled && !failedOpen) {
          window.clearTimeout(revealTimer);
          window.clearTimeout(failOpenTimer);
          setPhase("failed");
        }
        return;
      }
      if (cancelled || failedOpen) return;
      window.clearTimeout(revealTimer);
      window.clearTimeout(failOpenTimer);
      setPhase(loadingVisible.current ? "leaving" : "ready");
    });
    return () => {
      cancelled = true;
      window.clearTimeout(revealTimer);
      window.clearTimeout(failOpenTimer);
    };
  }, [failOpen, failOpenAfterMs, requestKey, requests, revealDelayMs, settleFrames, settleSelector]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const timer = window.setTimeout(() => setPhase("ready"), loadingExitDurationMs);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const readinessFailed = phase === "failed";
  const contentReady = phase === "leaving" || phase === "ready" || (failOpen && readinessFailed);
  const content = <AdaptiveReadinessFailureContext.Provider value={readinessFailed}>
    <AdaptiveReadinessContext.Provider value={contentReady}>{children}</AdaptiveReadinessContext.Provider>
  </AdaptiveReadinessFailureContext.Provider>;
  return <>
    {mountChildrenWhileLoading || contentReady ? content : null}
    {phase === "loading" || phase === "leaving" || (phase === "failed" && !failOpen) ? <RuntimeLoadingBuffer phase={phase} label={label} reason={reason}/> : null}
  </>;
}
