"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { MotionBoundary } from "../MotionBoundary";
import { MotionStage } from "../MotionStage";
import { H5_MOTION_ENABLED, h5MotionModules, h5MotionTiming } from "../motion-config";

const passedAsset = "/design/final-v1/motion/archive-clean/archive-result-passed-canvas.webp";

export function ArchiveResultColorMotion({ preview = false }: { preview?: boolean }) {
  const trigger = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const armed = useRef(false);
  const inView = useRef(false);
  const enabled = H5_MOTION_ENABLED && h5MotionModules.archiveResultColor && !preview;

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (!enabled || reduced || typeof IntersectionObserver === "undefined") { setComplete(true); return; }
    const node = trigger.current;
    if (!node) return;
    requestAnimationFrame(() => requestAnimationFrame(() => { armed.current = true; }));
    const tryStart = () => { if (armed.current && inView.current) setStarted(true); };
    const observer = new IntersectionObserver(([entry]) => {
      inView.current = entry.isIntersecting && entry.intersectionRatio >= h5MotionTiming.archiveResultColor.threshold;
      if (!armed.current || !inView.current) return;
      setStarted(true);
      observer.disconnect();
    }, { threshold: [h5MotionTiming.archiveResultColor.threshold] });
    observer.observe(node);
    window.addEventListener("wheel", tryStart, { passive: true });
    window.addEventListener("touchmove", tryStart, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener("wheel", tryStart); window.removeEventListener("touchmove", tryStart); };
  }, [enabled]);

  useEffect(() => {
    if (!ready || !started || complete) return;
    const timer = window.setTimeout(() => setComplete(true), h5MotionTiming.archiveResultColor.durationMs);
    return () => window.clearTimeout(timer);
  }, [complete, ready, started]);

  const onStateChange = useCallback((state: "disabled" | "loading" | "ready" | "failed" | "reduced") => {
    if (state === "ready") setReady(true);
    if (state === "disabled" || state === "failed" || state === "reduced") setComplete(true);
  }, []);
  const style = { "--archive-result-duration": `${h5MotionTiming.archiveResultColor.durationMs}ms` } as CSSProperties;

  return <div className={`archive-result-color ${ready ? "is-ready" : ""} ${started ? "is-started" : ""} ${complete ? "is-complete" : ""}`} style={style} data-motion-module="archiveResultColor" data-motion-started={started} data-motion-complete={complete} aria-hidden="true">
    <div ref={trigger} className="archive-result-color-trigger" />
    <MotionBoundary fallback={<Image className="archive-result-color-layer archive-result-color-passed" src={passedAsset} alt="" fill unoptimized />}>
      <MotionStage masterWidth={1000} masterHeight={5557} assets={[passedAsset]} enabled={enabled} crossfadeMs={0} fallback={<Image className="archive-result-color-layer archive-result-color-passed is-static" src={passedAsset} alt="" fill unoptimized />} onStateChange={onStateChange}>
        <Image className="archive-result-color-layer archive-result-color-passed" src={passedAsset} alt="" fill unoptimized />
      </MotionStage>
    </MotionBoundary>
  </div>;
}
