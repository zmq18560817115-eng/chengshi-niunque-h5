"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { MotionBoundary } from "../MotionBoundary";
import { MotionStage } from "../MotionStage";
import { H5_MOTION_ACCEPTANCE, H5_MOTION_ENABLED, h5MotionModules, h5MotionTiming } from "../motion-config";

const circleAsset = "/design/final-v1/motion/archive-clean/archive-latest-circle-canvas.webp";
const assets = [circleAsset] as const;
const completedKey = "archive-latest-circle-complete-v3";
// The mask centreline is derived from the alpha bounds of the approved
// 1000 x 5557 circle asset. It starts at the open end on the upper-left,
// follows the hand-drawn loop, and finishes at the second open end.
const circleStrokePath = "M 172 1590 C 110 1592 24 1606 25 1635 C 25 1664 130 1677 236 1674 C 350 1670 484 1655 480 1617 C 476 1594 330 1597 213 1600";

export function ArchiveLatestCircle({ preview = false }: { preview?: boolean }) {
  const maskId = `archive-latest-circle-mask-${useId().replaceAll(":", "")}`;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [complete, setComplete] = useState(false);
  const enabled = H5_MOTION_ENABLED && h5MotionModules.archiveLatestCircle;

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const restored = !H5_MOTION_ACCEPTANCE && sessionStorage.getItem(completedKey) === "true";
    if (!enabled || reduced || restored || preview) {
      setComplete(true);
      return;
    }
    const node = trigger.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entry.intersectionRatio < h5MotionTiming.archiveLatestCircle.threshold) return;
      setVisible(true);
      observer.disconnect();
    }, { threshold: [h5MotionTiming.archiveLatestCircle.threshold], rootMargin: "-12% 0px -12% 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, preview]);

  useEffect(() => {
    if (!ready || !visible || complete) return;
    const duration = h5MotionTiming.archiveLatestCircle.delayMs + h5MotionTiming.archiveLatestCircle.durationMs;
    const timer = window.setTimeout(() => {
      setComplete(true);
      sessionStorage.setItem(completedKey, "true");
    }, duration);
    return () => clearTimeout(timer);
  }, [complete, ready, visible]);

  const handleMotionState = useCallback((state: "disabled" | "loading" | "ready" | "failed" | "reduced") => {
    if (state === "ready") setReady(true);
    if (state === "failed" || state === "reduced" || state === "disabled") setComplete(true);
  }, []);
  const style = {
    "--archive-circle-delay": `${h5MotionTiming.archiveLatestCircle.delayMs}ms`,
    "--archive-circle-duration": `${h5MotionTiming.archiveLatestCircle.durationMs}ms`,
  } as CSSProperties;
  const fallback = <Image className="archive-latest-circle-image" src={circleAsset} alt="" fill unoptimized />;

  return <div ref={root} data-motion-module="archiveLatestCircle" className={`archive-latest-circle ${ready ? "is-ready" : ""} ${visible ? "is-visible" : ""} ${complete ? "is-complete" : ""}`} style={style} data-motion-ready={ready} data-motion-visible={visible} data-motion-complete={complete} aria-hidden="true">
    <div ref={trigger} className="archive-latest-circle-trigger"/>
    <MotionBoundary fallback={fallback}>
      <MotionStage masterWidth={1000} masterHeight={5557} assets={assets} enabled={enabled} crossfadeMs={0} fallback={fallback} onStateChange={handleMotionState}>
        <svg className="archive-latest-circle-svg is-animated" viewBox="0 0 1000 5557" preserveAspectRatio="none" focusable="false">
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="5557">
              <rect width="1000" height="5557" fill="black"/>
              <path className="archive-latest-circle-stroke" d={circleStrokePath} pathLength="1"/>
            </mask>
          </defs>
          <image className="archive-latest-circle-raster" href={circleAsset} x="0" y="0" width="1000" height="5557" preserveAspectRatio="none" mask={`url(#${maskId})`}/>
        </svg>
      </MotionStage>
    </MotionBoundary>
  </div>;
}
