"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { preloadHomepageAssets, type HomepageAssetRequest } from "@/components/h5/homepage-preload";
import { RuntimeLoadingBuffer, type RuntimeLoadingPhase } from "@/components/h5/RuntimeLoadingBuffer";

type ReadinessPhase = RuntimeLoadingPhase | "ready";

const loadingExitDurationMs = 260;
const routeBufferAttributes = ["data-guide-route-entry", "data-category-route-buffer"] as const;
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
}: {
  requests: readonly HomepageAssetRequest[];
  children: ReactNode;
  label?: string;
  reason?: string;
  mountChildrenWhileLoading?: boolean;
}) {
  const [phase, setPhase] = useState<ReadinessPhase>("loading");
  const routeBuffered = useRef(false);
  const requestKey = useMemo(() => requests.map(({ src, priority = "auto" }) => `${priority}:${src}`).join("|"), [requests]);

  useEffect(() => {
    let cancelled = false;
    routeBuffered.current = routeBufferAttributes.some((attribute) => document.documentElement.hasAttribute(attribute));
    setPhase("loading");
    void preloadHomepageAssets(requests).then((result) => {
      if (result.failed.length > 0) console.error(`[AdaptiveReadinessGate] assets failed: ${result.failed.join(", ")}`);
      if (!cancelled) setPhase(routeBuffered.current ? "ready" : "leaving");
    });
    return () => { cancelled = true; };
  }, [requestKey, requests]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const timer = window.setTimeout(() => setPhase("ready"), loadingExitDurationMs);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const contentReady = phase !== "loading";
  if (phase === "ready") return <AdaptiveReadinessContext.Provider value>{children}</AdaptiveReadinessContext.Provider>;
  return <>
    {mountChildrenWhileLoading || contentReady ? <AdaptiveReadinessContext.Provider value={contentReady}>{children}</AdaptiveReadinessContext.Provider> : null}
    <RuntimeLoadingBuffer phase={phase} label={label} reason={reason}/>
  </>;
}
