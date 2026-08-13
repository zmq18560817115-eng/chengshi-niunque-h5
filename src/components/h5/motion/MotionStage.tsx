"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { H5_MOTION_ENABLED, MOTION_ASSET_TIMEOUT_MS } from "./motion-config";

type MotionState = "disabled" | "loading" | "ready" | "failed" | "reduced";
type Props = { children: ReactNode; fallback: ReactNode; assets?: readonly string[]; masterWidth: number; masterHeight: number; enabled?: boolean; crossfadeMs?: number; onStateChange?: (state: MotionState) => void; onAnimationReady?: () => void };

export function MotionStage({ children, fallback, assets = [], masterWidth, masterHeight, enabled = H5_MOTION_ENABLED, crossfadeMs = 180, onStateChange, onAnimationReady }: Props) {
  const [state, setState] = useState<MotionState>(enabled ? "loading" : "disabled");
  const assetKey = useMemo(() => assets.join("\n"), [assets]);
  useEffect(() => {
    if (!enabled) { setState("disabled"); onStateChange?.("disabled"); return; }
    if (matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setState("reduced"); onStateChange?.("reduced"); return; }
    let cancelled = false;
    const cleanupTimers: number[] = [];
    const cleanupFrames: number[] = [];
    setState("loading"); onStateChange?.("loading");
    const fail = () => { if (!cancelled) { setState("failed"); onStateChange?.("failed"); } };
    const timer = window.setTimeout(fail, MOTION_ASSET_TIMEOUT_MS);
    void Promise.all(assets.map((src) => new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      const loaded = new Promise<void>((loadedResolve, loadedReject) => {
        image.onload = () => loadedResolve();
        image.onerror = () => loadedReject(new Error(src));
      });
      image.src = src;
      const decoded = image.decode ? image.decode() : Promise.resolve();
      void Promise.all([loaded, decoded]).then(() => resolve()).catch(() => reject(new Error(src)));
    }))).then(() => {
      if (cancelled) return;
      clearTimeout(timer);
      cleanupFrames.push(requestAnimationFrame(() => cleanupFrames.push(requestAnimationFrame(() => {
        if (cancelled) return;
        setState("ready"); onStateChange?.("ready");
        const startTimer = window.setTimeout(() => cleanupFrames.push(requestAnimationFrame(() => { if (!cancelled) onAnimationReady?.(); })), crossfadeMs);
        cleanupTimers.push(startTimer);
      }))));
    }).catch(() => { clearTimeout(timer); fail(); });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      cleanupTimers.forEach((id) => clearTimeout(id));
      cleanupFrames.forEach((id) => cancelAnimationFrame(id));
    };
  }, [assetKey, assets, crossfadeMs, enabled, onAnimationReady, onStateChange]);
  if (state === "disabled" || state === "reduced" || state === "failed") return fallback;
  return <div className={`motion-stage is-${state}`} data-motion-state={state} style={{ "--motion-master-ratio": `${masterWidth} / ${masterHeight}`, "--motion-crossfade-ms": `${crossfadeMs}ms` } as CSSProperties}>
    <div className="motion-stage-content" aria-hidden={state !== "ready"}>{children}</div>
    <div className="motion-stage-fallback">{fallback}</div>
  </div>;
}
