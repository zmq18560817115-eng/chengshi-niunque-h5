"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { MotionBoundary } from "../MotionBoundary";
import { MotionStage } from "../MotionStage";
import { H5_MOTION_ACCEPTANCE, H5_MOTION_ENABLED, h5MotionModules, h5MotionTiming } from "../motion-config";

const masterWidth = 1000;
const masterHeight = 5557;
const cleanPatch = { src: "/design/final-v1/motion/archive-runtime/story-copy-clean-patch.png", x: 240, y: 4788, width: 560, height: 230 };
const lineAssets = [
  { src: "/design/final-v1/motion/archive-runtime/story-line-01.png", x: 266, y: 4798, width: 496, height: 35 },
  { src: "/design/final-v1/motion/archive-runtime/story-line-02.png", x: 310, y: 4846, width: 399, height: 31 },
  { src: "/design/final-v1/motion/archive-runtime/story-line-03.png", x: 254, y: 4928, width: 512, height: 36 },
  { src: "/design/final-v1/motion/archive-runtime/story-line-04.png", x: 456, y: 4978, width: 112, height: 30 },
] as const;
const motionAssets = [cleanPatch.src, ...lineAssets.map(({ src }) => src)];
export const archiveStoryWarmAssets = motionAssets;
const completedKey = "archive-story-copy-complete-v3";

const position = (asset: { x: number; y: number; width: number; height: number }) => ({
  left: `${asset.x / masterWidth * 100}%`,
  top: `${asset.y / masterHeight * 100}%`,
  width: `${asset.width / masterWidth * 100}%`,
  height: `${asset.height / masterHeight * 100}%`,
}) as CSSProperties;

const wasCompleted = () => {
  try { return sessionStorage.getItem(completedKey) === "true"; }
  catch { return false; }
};

const rememberCompleted = () => {
  try { sessionStorage.setItem(completedKey, "true"); }
  catch { /* Storage can be unavailable in hardened in-app browsers. */ }
};

const lineStartMs = (index: number) => (
  index * h5MotionTiming.archiveStoryCopy.lineStepMs
  + h5MotionTiming.archiveStoryCopy.lineOffsetsMs[index]
);

const totalDurationMs = h5MotionTiming.archiveStoryCopy.delayMs
  + Math.max(...lineAssets.map((_, index) => lineStartMs(index)))
  + h5MotionTiming.archiveStoryCopy.lineDurationMs;

export function ArchiveStoryCopyMotion({ preview = false }: { preview?: boolean }) {
  const trigger = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [complete, setComplete] = useState(true);
  const manualScroll = useRef(false);
  const inView = useRef(false);
  const lastY = useRef(0);
  const armed = useRef(false);
  const remainingMs = useRef(totalDurationMs);
  const enabled = H5_MOTION_ENABLED && h5MotionModules.archiveStoryCopy && !preview;

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const restored = !H5_MOTION_ACCEPTANCE && wasCompleted();
    if (!enabled || reduced || restored || typeof IntersectionObserver === "undefined") {
      setComplete(true);
      return;
    }
    setComplete(false);
    lastY.current = window.scrollY;
    requestAnimationFrame(() => requestAnimationFrame(() => { armed.current = true; lastY.current = window.scrollY; }));
    const markManual = () => {
      manualScroll.current = true;
      if (inView.current) setStarted(true);
    };
    const markScroll = () => {
      const nextY = window.scrollY;
      if (armed.current && nextY > lastY.current + 2) markManual();
      lastY.current = nextY;
    };
    window.addEventListener("wheel", markManual, { passive: true });
    window.addEventListener("touchmove", markManual, { passive: true });
    window.addEventListener("scroll", markScroll, { passive: true });
    const node = trigger.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      inView.current = entry.isIntersecting && entry.intersectionRatio >= h5MotionTiming.archiveStoryCopy.threshold;
      setVisible(inView.current);
      if (manualScroll.current && inView.current) setStarted(true);
    }, { threshold: [h5MotionTiming.archiveStoryCopy.threshold] });
    observer.observe(node);
    return () => {
      observer.disconnect();
      window.removeEventListener("wheel", markManual);
      window.removeEventListener("touchmove", markManual);
      window.removeEventListener("scroll", markScroll);
    };
  }, [enabled]);

  useEffect(() => {
    if (!ready || !started || !visible || complete) return;
    const startedAt = performance.now();
    const timer = window.setTimeout(() => {
      remainingMs.current = 0;
      setComplete(true);
      rememberCompleted();
    }, remainingMs.current);
    return () => {
      clearTimeout(timer);
      remainingMs.current = Math.max(0, remainingMs.current - (performance.now() - startedAt));
    };
  }, [complete, ready, started, visible]);

  const handleMotionState = useCallback((state: "disabled" | "loading" | "ready" | "failed" | "reduced") => {
    if (state === "loading") setReady(false);
    if (state === "ready") setReady(true);
    if (state === "disabled" || state === "failed" || state === "reduced") {
      setReady(false);
      setComplete(true);
    }
  }, []);

  const style = {
    "--archive-story-delay": `${h5MotionTiming.archiveStoryCopy.delayMs}ms`,
    "--archive-story-duration": `${h5MotionTiming.archiveStoryCopy.lineDurationMs}ms`,
    "--archive-story-step": `${h5MotionTiming.archiveStoryCopy.lineStepMs}ms`,
    "--archive-story-easing": h5MotionTiming.archiveStoryCopy.easing,
  } as CSSProperties;

  return <div data-motion-module="archiveStoryCopy" className={`archive-story-copy ${ready ? "is-ready" : ""} ${started ? "is-started" : ""} ${visible ? "is-visible" : ""} ${complete ? "is-complete" : ""}`} style={style} data-motion-ready={ready} data-motion-started={started} data-motion-visible={visible} data-motion-complete={complete}>
    <div ref={trigger} className="archive-story-copy-trigger"/>
    {!complete && <MotionBoundary fallback={null}>
      <MotionStage masterWidth={masterWidth} masterHeight={masterHeight} assets={motionAssets} enabled={enabled} crossfadeMs={0} fallback={null} onStateChange={handleMotionState}>
        <Image className="archive-story-copy-clean-patch" src={cleanPatch.src} alt="" width={cleanPatch.width} height={cleanPatch.height} style={position(cleanPatch)} unoptimized />
        {lineAssets.map((line, index) => <Image key={line.src} className="archive-story-copy-line" data-story-line={index + 1} src={line.src} alt="" width={line.width} height={line.height} style={{ ...position(line), "--archive-story-index": index, "--archive-story-line-offset": `${h5MotionTiming.archiveStoryCopy.lineOffsetsMs[index]}ms` } as CSSProperties} unoptimized/>)}
      </MotionStage>
    </MotionBoundary>}
  </div>;
}
