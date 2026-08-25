"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { MotionBoundary } from "../MotionBoundary";
import { MotionStage } from "../MotionStage";
import { H5_MOTION_ENABLED, h5MotionModules, h5MotionTiming } from "../motion-config";

type UnlockState = "idle" | "revealing" | "revealed" | "fallback";

const tabAsset = "/design/final-v1/长图输出/长图模块1/h5长图-下滑条.png";
const assets = [tabAsset] as const;
export const archiveUnlockWarmAssets = assets;
const startBottom = (5557 - 1860) / 5557 * 100;
const endBottom = (5557 - 2154) / 5557 * 100;

function UnlockTabLayer() {
  return (
    <div className="archive-unlock-tab-clip is-moving">
      <Image
        className="archive-unlock-tab-image"
        src={tabAsset}
        alt=""
        width={3034}
        height={4334}
        sizes="(max-width: 750px) 151.7vw, 1137.75px"
        unoptimized
      />
    </div>
  );
}

export function ArchiveUnlockTabMotion({ preview = false, enabled: enabledOverride }: { preview?: boolean; enabled?: boolean }) {
  const [state, setState] = useState<UnlockState>("idle");
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const lastY = useRef(0);
  const accumulated = useRef(0);
  const trustedScroll = useRef(false);
  const frame = useRef<number | null>(null);
  const trustTimer = useRef<number | null>(null);
  const enabled = enabledOverride ?? (H5_MOTION_ENABLED && h5MotionModules.archiveUnlockTab);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (!enabled || preview || reduced) {
      setProgress(1);
      setState("fallback");
      return;
    }
    setProgress(0);
    setState("idle");
    accumulated.current = 0;
    lastY.current = window.scrollY;
    const markTrusted = () => {
      trustedScroll.current = true;
      if (trustTimer.current !== null) clearTimeout(trustTimer.current);
      trustTimer.current = window.setTimeout(() => { trustedScroll.current = false; }, 500);
    };
    const onScroll = () => {
      if (!trustedScroll.current || frame.current !== null) return;
      frame.current = -1;
      const frameId = requestAnimationFrame(() => {
        frame.current = null;
        const currentY = window.scrollY;
        const delta = currentY - lastY.current;
        lastY.current = currentY;
        if (delta > 0) accumulated.current += delta;
        const nextProgress = Math.min(1, accumulated.current / h5MotionTiming.archiveUnlockTab.revealDistancePx);
        setProgress(nextProgress);
        setState(nextProgress >= 1 ? "revealed" : nextProgress > 0 ? "revealing" : "idle");
      });
      if (frame.current === -1) frame.current = frameId;
    };
    window.addEventListener("wheel", markTrusted, { passive: true });
    window.addEventListener("touchmove", markTrusted, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", markTrusted);
      window.removeEventListener("touchmove", markTrusted);
      window.removeEventListener("scroll", onScroll);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      if (trustTimer.current !== null) clearTimeout(trustTimer.current);
    };
  }, [enabled, preview]);

  const handleMotionState = useCallback((motionState: "disabled" | "loading" | "ready" | "failed" | "reduced") => {
    setReady(motionState === "ready");
    if (motionState === "failed" || motionState === "reduced" || motionState === "disabled") {
      setProgress(1);
      setState("fallback");
    }
  }, []);
  const fallback = <UnlockTabLayer />;
  const style = {
    "--archive-unlock-follow": `${h5MotionTiming.archiveUnlockTab.followMs}ms`,
    // The untouched 3034 x 4334 source shares module one's half-scale
    // transform. Its tab begins at master y=1817 and remains below the
    // yellow folder-front layer (z=30), so that layer forms the real seam.
    "--archive-unlock-reveal-top": `${1817 / 5557 * 100}%`,
    "--archive-unlock-current-bottom": `${startBottom - (startBottom - endBottom) * progress}%`,
    "--archive-unlock-end-bottom": `${(5557 - 2154) / 5557 * 100}%`,
  } as CSSProperties;

  return <div data-motion-module="archiveUnlockTab" className={`archive-unlock-tab-motion is-${state} ${ready ? "is-ready" : ""}`} style={style} data-unlock-state={state} data-unlock-progress={progress.toFixed(3)} data-unlock-ready={ready} aria-hidden="true">
    <MotionBoundary fallback={fallback}>
      <MotionStage masterWidth={1000} masterHeight={5557} assets={assets} enabled={enabled} crossfadeMs={0} fallback={fallback} onStateChange={handleMotionState}>
        <UnlockTabLayer />
      </MotionStage>
    </MotionBoundary>
  </div>;
}
