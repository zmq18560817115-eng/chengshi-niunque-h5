"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { MotionBoundary } from "../MotionBoundary";
import { MotionStage } from "../MotionStage";
import { H5_MOTION_ENABLED, h5MotionModules } from "../motion-config";

const fishAssets = [1, 2, 3, 4].map((index) => `/design/final-v1/motion/archive-clean/archive-fish-${String(index).padStart(2, "0")}-canvas.webp`);

export function ArchiveFishFloatMotion({ preview = false }: { preview?: boolean }) {
  const trigger = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [fallback, setFallback] = useState(false);
  const entered = useRef(false);
  const enabled = H5_MOTION_ENABLED && h5MotionModules.archiveFishFloat && !preview;

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (!enabled || reduced || typeof IntersectionObserver === "undefined") {
      setFallback(true);
      setVisible(true);
      return;
    }
    const node = trigger.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
        entered.current = true;
        setVisible(true);
      } else if (entered.current) setVisible(false);
    }, { threshold: [0, 0.3] });
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  const onStateChange = useCallback((state: "disabled" | "loading" | "ready" | "failed" | "reduced") => {
    if (state === "ready") setReady(true);
    if (state === "disabled" || state === "failed" || state === "reduced") {
      setFallback(true);
      setVisible(true);
    }
  }, []);
  const staticFish = <>{fishAssets.map((src) => <Image key={src} className="archive-fish-float-layer is-static" src={src} alt="" fill unoptimized />)}</>;

  return <div className={`archive-fish-float ${ready ? "is-ready" : ""} ${visible ? "is-visible" : ""} ${fallback ? "is-fallback" : ""}`} data-motion-module="archiveFishFloat" aria-hidden="true">
    <div ref={trigger} className="archive-fish-float-trigger" />
    <MotionBoundary fallback={staticFish}>
      <MotionStage masterWidth={1000} masterHeight={5557} assets={fishAssets} enabled={enabled} crossfadeMs={0} fallback={staticFish} onStateChange={onStateChange}>
        {fishAssets.map((src, index) => <Image key={src} className="archive-fish-float-layer" src={src} alt="" fill unoptimized style={{ "--archive-fish-delay": `${index * 180}ms`, "--archive-fish-duration": `${2700 + index * 160}ms` } as CSSProperties} />)}
      </MotionStage>
    </MotionBoundary>
  </div>;
}
