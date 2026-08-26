"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { preloadHomepageAssets, type HomepageAssetRequest } from "@/components/h5/homepage-preload";
import { RuntimeLoadingBuffer, type RuntimeLoadingPhase } from "@/components/h5/RuntimeLoadingBuffer";

type ReadinessPhase = RuntimeLoadingPhase | "waiting" | "ready";

const loadingExitDurationMs = 260;
export const adaptiveLoadingRevealDelayMs = 220;
const AdaptiveReadinessContext = createContext(true);

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
}: {
  requests: readonly HomepageAssetRequest[];
  children: ReactNode;
  label?: string;
  reason?: string;
  mountChildrenWhileLoading?: boolean;
  revealDelayMs?: number;
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
    void preloadHomepageAssets(requests).then((result) => {
      if (result.failed.length > 0) console.error(`[AdaptiveReadinessGate] assets failed: ${result.failed.join(", ")}`);
      if (cancelled) return;
      window.clearTimeout(revealTimer);
      setPhase(loadingVisible.current ? "leaving" : "ready");
    });
    return () => {
      cancelled = true;
      window.clearTimeout(revealTimer);
    };
  }, [requestKey, requests, revealDelayMs]);

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
