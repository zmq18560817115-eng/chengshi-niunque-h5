"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useVisualViewportHeight } from "@/components/h5/useVisualViewportHeight";

export type RuntimeLoadingPhase = "loading" | "leaving";

export const routeLoadingRevealDelayMs = 220;

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
          <span className="guide-loading-buffer-progress" aria-hidden="true" />
          <span className="sr-only">{label}</span>
        </section>
      </main>
    </div>
  );
}
