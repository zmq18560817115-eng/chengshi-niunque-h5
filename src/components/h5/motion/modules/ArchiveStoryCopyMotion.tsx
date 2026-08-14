"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { MotionBoundary } from "../MotionBoundary";
import { MotionStage } from "../MotionStage";
import { H5_MOTION_ACCEPTANCE, H5_MOTION_ENABLED, h5MotionModules, h5MotionTiming } from "../motion-config";

const lineAssets = [1, 2, 3, 4].map((index) => `/design/final-v1/motion/archive-clean/story-line-${String(index).padStart(2, "0")}-canvas.webp`);
const completedKey = "archive-story-copy-complete-v2";

export function ArchiveStoryCopyMotion({ preview = false }: { preview?: boolean }) {
  const trigger = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const manualScroll = useRef(false);
  const inView = useRef(false);
  const lastY = useRef(0);
  const armed = useRef(false);
  const enabled = H5_MOTION_ENABLED && h5MotionModules.archiveStoryCopy && !preview;

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const restored = !H5_MOTION_ACCEPTANCE && sessionStorage.getItem(completedKey) === "true";
    if (!enabled || reduced || restored || typeof IntersectionObserver === "undefined") {
      setComplete(true);
      return;
    }
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
      if (!manualScroll.current || !entry.isIntersecting || entry.intersectionRatio < h5MotionTiming.archiveStoryCopy.threshold) return;
      setStarted(true);
      observer.disconnect();
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
    if (!ready || !started || complete) return;
    const total = h5MotionTiming.archiveStoryCopy.delayMs + lineAssets.length * h5MotionTiming.archiveStoryCopy.lineDurationMs + (lineAssets.length - 1) * h5MotionTiming.archiveStoryCopy.linePauseMs;
    const timer = window.setTimeout(() => {
      setComplete(true);
      sessionStorage.setItem(completedKey, "true");
    }, total);
    return () => clearTimeout(timer);
  }, [complete, ready, started]);

  const handleMotionState = useCallback((state: "disabled" | "loading" | "ready" | "failed" | "reduced") => {
    if (state === "ready") setReady(true);
    if (state === "disabled" || state === "failed" || state === "reduced") setComplete(true);
  }, []);

  const fallback = <>{lineAssets.map((src) => <Image key={src} className="archive-story-copy-line is-static" src={src} alt="" fill unoptimized />)}</>;
  const style = {
    "--archive-story-delay": `${h5MotionTiming.archiveStoryCopy.delayMs}ms`,
    "--archive-story-duration": `${h5MotionTiming.archiveStoryCopy.lineDurationMs}ms`,
    "--archive-story-gap": `${h5MotionTiming.archiveStoryCopy.lineDurationMs + h5MotionTiming.archiveStoryCopy.linePauseMs}ms`,
    "--archive-story-easing": h5MotionTiming.archiveStoryCopy.easing,
  } as CSSProperties;

  return <div data-motion-module="archiveStoryCopy" className={`archive-story-copy ${ready ? "is-ready" : ""} ${started ? "is-started" : ""} ${complete ? "is-complete" : ""}`} style={style} data-motion-ready={ready} data-motion-started={started} data-motion-complete={complete}>
    <div ref={trigger} className="archive-story-copy-trigger"/>
    <MotionBoundary fallback={fallback}>
      <MotionStage masterWidth={1000} masterHeight={5557} assets={lineAssets} enabled={enabled} crossfadeMs={0} fallback={fallback} onStateChange={handleMotionState}>
        {lineAssets.map((src, index) => {
          return <Image key={src} className="archive-story-copy-line" data-story-line={index + 1} src={src} alt="" fill style={{ "--archive-story-index": index } as CSSProperties} unoptimized/>;
        })}
      </MotionStage>
    </MotionBoundary>
  </div>;
}
