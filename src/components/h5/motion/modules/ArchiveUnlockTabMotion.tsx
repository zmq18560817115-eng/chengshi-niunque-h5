"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { MotionBoundary } from "../MotionBoundary";
import { MotionStage } from "../MotionStage";
import { H5_MOTION_ENABLED, h5MotionModules, h5MotionTiming } from "../motion-config";

type UnlockState = "idle" | "revealing" | "revealed" | "fallback";

const tabAsset = "/design/final-v1/motion/archive-clean/archive-unlock-tab-canvas.webp";
const assets = [tabAsset] as const;
const startBottom = (5557 - 1926) / 5557 * 100;
const endBottom = (5557 - 2144) / 5557 * 100;

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
  const fallback = <Image className="archive-unlock-tab-image is-moving" src={tabAsset} alt="" fill unoptimized />;
  const style = {
    "--archive-unlock-follow": `${h5MotionTiming.archiveUnlockTab.followMs}ms`,
    // Pixel-derived from the 1000 x 5557 canvases. The moving layer starts
    // immediately below the 68px head so the two pieces share one seam.
    "--archive-unlock-left": `${840 / 1000 * 100}%`,
    "--archive-unlock-right": `${(1000 - 918) / 1000 * 100}%`,
    "--archive-unlock-reveal-top": `${1872 / 5557 * 100}%`,
    "--archive-unlock-current-bottom": `${startBottom - (startBottom - endBottom) * progress}%`,
    "--archive-unlock-end-bottom": `${(5557 - 2144) / 5557 * 100}%`,
  } as CSSProperties;

  return <div data-motion-module="archiveUnlockTab" className={`archive-unlock-tab-motion is-${state} ${ready ? "is-ready" : ""}`} style={style} data-unlock-state={state} data-unlock-progress={progress.toFixed(3)} data-unlock-ready={ready} aria-hidden="true">
    <MotionBoundary fallback={fallback}>
      <MotionStage masterWidth={1000} masterHeight={5557} assets={assets} enabled={enabled} crossfadeMs={0} fallback={fallback} onStateChange={handleMotionState}>
        <Image className="archive-unlock-tab-image is-moving" src={tabAsset} alt="" fill sizes="(max-width: 750px) 100vw, 750px" unoptimized/>
      </MotionStage>
    </MotionBoundary>
  </div>;
}
