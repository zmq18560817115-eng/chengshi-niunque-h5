"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useVisualViewportHeight } from "@/components/h5/useVisualViewportHeight";

export type RuntimeLoadingPhase = "loading" | "leaving";

export const routeLoadingRevealDelayMs = 220;
export const runtimeLoadingAnimationDelayMs = 900;

export function DeferredRuntimeLoadingBuffer({
  delayMs = routeLoadingRevealDelayMs,
  label = "正在准备当前页面",
  reason = "route-data",
}: {
  delayMs?: number;
  label?: string;
  reason?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  return visible ? <RuntimeLoadingBuffer label={label} reason={reason}/> : null;
}

export function RuntimeLoadingBuffer({
  phase = "loading",
  label = "正在准备页面内容",
  reason = "route",
}: {
  phase?: RuntimeLoadingPhase;
  label?: string;
  reason?: string;
}) {
  useVisualViewportHeight();
  // The guide clone already is the route buffer. Keep the heavier poster/GIF
  // out of the DOM for this component lifetime so it cannot decode underneath
  // the handoff and compete for mobile GPU memory during the reveal.
  const [suppressedByGuideContinuity] = useState(() => typeof document !== "undefined"
    && document.documentElement.hasAttribute("data-guide-route-entry"));
  const [showAnimatedBuffer, setShowAnimatedBuffer] = useState(false);

  useEffect(() => {
    if (phase !== "loading") {
      setShowAnimatedBuffer(false);
      return;
    }
    // During the guide handoff the composited guide clone is the intentional
    // continuity buffer. Avoid decoding the heavier loading GIF underneath it.
    if (document.documentElement.hasAttribute("data-guide-route-entry")) {
      setShowAnimatedBuffer(false);
      return;
    }
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const constrainedNetwork = connection?.saveData === true || connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g";
    if (reducedMotion || constrainedNetwork) {
      setShowAnimatedBuffer(false);
      return;
    }
    const timer = window.setTimeout(() => setShowAnimatedBuffer(true), runtimeLoadingAnimationDelayMs);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (suppressedByGuideContinuity) return null;

  return (
    <div className={`runtime-loading-layer is-${phase}`} data-loading-reason={reason}>
      <main className={`guide-loading-buffer is-${phase}`} aria-label="页面加载缓冲" aria-busy={phase === "loading"}>
        <section className="guide-loading-buffer-stage" aria-live="polite">
          <Image
            className="guide-loading-buffer-poster"
            src="/design/guide/data-loading-buffer-poster.webp"
            alt=""
            fill
            sizes="(max-width: 750px) 100vw, 750px"
            priority
            unoptimized
          />
          {showAnimatedBuffer ? <Image
            className="guide-loading-buffer-gif"
            src="/design/guide/data-loading-buffer.gif"
            alt={label}
            fill
            sizes="(max-width: 750px) 100vw, 750px"
            fetchPriority="low"
            unoptimized
          /> : null}
          <span className="sr-only">{label}</span>
        </section>
      </main>
    </div>
  );
}
