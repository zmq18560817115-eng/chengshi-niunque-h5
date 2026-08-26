"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { H5_MOTION_ENABLED, h5MotionModules, h5MotionTiming } from "../motion-config";

type UnlockState = "idle" | "revealing" | "revealed" | "fallback";

const tabAsset = "/design/final-v1/archive-unlock-ribbon.webp";
const assets = [tabAsset] as const;
export const archiveUnlockWarmAssets = assets;

// The approved source is a 3034 x 4334 transparent canvas whose visible
// ribbon occupies only 193 x 674 pixels. This existing lossless tight crop is
// positioned at the exact source bbox, reducing the decoded surface by 99%.
const initialVisibleMasterHeight = 43;
const ribbonMasterHeight = 337;
const initialHiddenBottom = (ribbonMasterHeight - initialVisibleMasterHeight) / ribbonMasterHeight * 100;

export function ArchiveUnlockTabMotion({ preview = false, enabled: enabledOverride }: { preview?: boolean; enabled?: boolean }) {
  const [state, setState] = useState<UnlockState>("idle");
  const [ready, setReady] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const lastY = useRef(0);
  const accumulated = useRef(0);
  const trustedScroll = useRef(false);
  const frame = useRef<number | null>(null);
  const trustTimer = useRef<number | null>(null);
  const enabled = enabledOverride ?? (H5_MOTION_ENABLED && h5MotionModules.archiveUnlockTab);

  const applyProgress = useCallback((rawProgress: number) => {
    const progress = Math.max(0, Math.min(1, rawProgress));
    progressRef.current = progress;
    const root = rootRef.current;
    if (!root) return;
    root.style.setProperty("--archive-unlock-hidden-bottom", `${initialHiddenBottom * (1 - progress)}%`);
    root.dataset.unlockProgress = progress.toFixed(3);
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (!enabled || preview || reduced) {
      applyProgress(1);
      setState("fallback");
      return;
    }
    applyProgress(0);
    setState("idle");
    accumulated.current = 0;
    lastY.current = window.scrollY;
    const markTrusted = () => {
      trustedScroll.current = true;
      if (trustTimer.current !== null) clearTimeout(trustTimer.current);
      trustTimer.current = window.setTimeout(() => { trustedScroll.current = false; }, 500);
    };
    const onScroll = () => {
      if (frame.current !== null) return;
      // Capture trust at scheduling time. A pending scroll-position restore
      // stays non-interactive even if the first touch starts before its RAF.
      const shouldAccumulate = trustedScroll.current;
      frame.current = -1;
      const frameId = requestAnimationFrame(() => {
        frame.current = null;
        const currentY = window.scrollY;
        const delta = currentY - lastY.current;
        lastY.current = currentY;
        if (!shouldAccumulate) return;
        if (delta > 0) accumulated.current += delta;
        const nextProgress = Math.min(1, accumulated.current / h5MotionTiming.archiveUnlockTab.revealDistancePx);
        applyProgress(nextProgress);
        const nextState: UnlockState = nextProgress >= 1 ? "revealed" : nextProgress > 0 ? "revealing" : "idle";
        setState((currentState) => currentState === nextState ? currentState : nextState);
      });
      if (frame.current === -1) frame.current = frameId;
    };
    window.addEventListener("wheel", markTrusted, { passive: true });
    window.addEventListener("touchstart", markTrusted, { passive: true });
    window.addEventListener("touchmove", markTrusted, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", markTrusted);
      window.removeEventListener("touchstart", markTrusted);
      window.removeEventListener("touchmove", markTrusted);
      window.removeEventListener("scroll", onScroll);
      if (frame.current !== null && frame.current >= 0) cancelAnimationFrame(frame.current);
      if (trustTimer.current !== null) clearTimeout(trustTimer.current);
    };
  }, [applyProgress, enabled, preview]);

  const style = {
    "--archive-unlock-follow": `${h5MotionTiming.archiveUnlockTab.followMs}ms`,
  } as CSSProperties;

  return <div ref={rootRef} data-motion-module="archiveUnlockTab" className={`archive-unlock-tab-motion is-${state} ${ready ? "is-ready" : ""}`} style={style} data-unlock-state={state} data-unlock-progress={progressRef.current.toFixed(3)} data-unlock-ready={ready} aria-hidden="true">
    <div className="archive-unlock-tab-clip is-moving">
      <Image
        className="archive-unlock-tab-image"
        src={tabAsset}
        alt=""
        width={193}
        height={674}
        sizes="(max-width: 750px) 9.65vw, 72.375px"
        unoptimized
        onLoad={() => setReady(true)}
        onError={() => {
          setReady(false);
          applyProgress(1);
          setState("fallback");
        }}
      />
    </div>
  </div>;
}
