"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useVisualViewportHeight } from "@/components/h5/useVisualViewportHeight";

export type RuntimeLoadingPhase = "loading" | "leaving" | "failed";

// Route loading must be paintable on the first fallback frame. Delaying this
// layer lets the source page finish its exit before Next has mounted a visual
// replacement, which exposes the document background on slow navigations.
export const routeLoadingRevealDelayMs = 0;

export function DeferredRuntimeLoadingBuffer({
  delayMs = routeLoadingRevealDelayMs,
  label = "正在准备当前页面",
  reason = "route-data",
}: {
  delayMs?: number;
  label?: string;
  reason?: string;
}) {
  const [visible, setVisible] = useState(delayMs <= 0);

  useEffect(() => {
    if (delayMs <= 0) {
      setVisible(true);
      return;
    }
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
          {phase === "failed" ? <div className="runtime-loading-error" role="alert">
            <strong>内容暂时无法加载</strong>
            <span>请检查网络后重试，当前画面会保留。</span>
            <button type="button" onClick={() => window.location.reload()}>重新加载</button>
          </div> : null}
          <span className="sr-only">{label}</span>
        </section>
      </main>
    </div>
  );
}
