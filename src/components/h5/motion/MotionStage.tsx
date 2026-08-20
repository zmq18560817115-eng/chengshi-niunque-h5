"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { H5_MOTION_ENABLED, MOTION_ASSET_TIMEOUT_MS } from "./motion-config";

type MotionState = "disabled" | "loading" | "ready" | "failed" | "reduced";
type MotionPreference = "unknown" | "allowed" | "reduced";
type Props = { children: ReactNode; fallback: ReactNode; loadingFallback?: ReactNode; assets?: readonly string[]; masterWidth: number; masterHeight: number; enabled?: boolean; crossfadeMs?: number; onStateChange?: (state: MotionState) => void; onAnimationReady?: () => void };

export function MotionStage({ children, fallback, loadingFallback, assets = [], masterWidth, masterHeight, enabled = H5_MOTION_ENABLED, crossfadeMs = 180, onStateChange, onAnimationReady }: Props) {
  const [state, setState] = useState<MotionState>(enabled ? "loading" : "disabled");
  const [motionPreference, setMotionPreference] = useState<MotionPreference>("unknown");
  const assetKey = assets.join("\n");

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) { setMotionPreference("allowed"); return; }
    const sync = () => setMotionPreference(media.matches ? "reduced" : "allowed");
    sync();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }
    media.addListener?.(sync);
    return () => media.removeListener?.(sync);
  }, []);

  useEffect(() => {
    if (!enabled) { setState("disabled"); onStateChange?.("disabled"); return; }
    if (motionPreference === "unknown") return;
    if (motionPreference === "reduced") { setState("reduced"); onStateChange?.("reduced"); return; }
    let cancelled = false;
    let settled = false;
    const cleanupTimers: number[] = [];
    const cleanupFrames: number[] = [];
    const assetList = assetKey ? assetKey.split("\n") : [];
    setState("loading"); onStateChange?.("loading");
    const fail = () => {
      if (cancelled || settled) return;
      settled = true;
      setState("failed");
      onStateChange?.("failed");
    };
    const timer = window.setTimeout(fail, MOTION_ASSET_TIMEOUT_MS);
    void Promise.all(assetList.map((src) => new Promise<void>((resolve, reject) => {
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
      if (cancelled || settled) return;
      settled = true;
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
  }, [assetKey, crossfadeMs, enabled, motionPreference, onAnimationReady, onStateChange]);
  if (motionPreference === "unknown") return loadingFallback ?? fallback;
  if (state === "disabled" || state === "reduced" || state === "failed") return fallback;
  return <div className={`motion-stage is-${state}`} data-motion-state={state} style={{ "--motion-master-ratio": `${masterWidth} / ${masterHeight}`, "--motion-crossfade-ms": `${crossfadeMs}ms` } as CSSProperties}>
    <div className="motion-stage-content" aria-hidden={state !== "ready"}>{children}</div>
    <div className="motion-stage-fallback">{loadingFallback ?? fallback}</div>
  </div>;
}
