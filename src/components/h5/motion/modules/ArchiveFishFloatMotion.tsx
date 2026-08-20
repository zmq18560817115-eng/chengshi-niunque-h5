"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { MotionBoundary } from "../MotionBoundary";
import { MotionStage } from "../MotionStage";
import { H5_MOTION_ENABLED, h5MotionModules } from "../motion-config";

const masterWidth = 1000;
const masterHeight = 5557;
const cleanBaseAsset = { src: "/design/final-v1/motion/archive-runtime/fish-clean-patch.png", x: 0, y: 4380, width: 1000, height: 150 };
const fishAssets = [
  { src: "/design/final-v1/motion/archive-runtime/fish-01.png", x: 57, y: 4414, width: 134, height: 76, delay: -120, duration: 2100, tilt: 0.9, jitter: 0.18 },
  { src: "/design/final-v1/motion/archive-runtime/fish-02.png", x: 303, y: 4414, width: 136, height: 70, delay: -780, duration: 2380, tilt: 0.65, jitter: 0.12 },
  { src: "/design/final-v1/motion/archive-runtime/fish-03.png", x: 546, y: 4418, width: 136, height: 69, delay: -430, duration: 2240, tilt: 1, jitter: 0.2 },
  { src: "/design/final-v1/motion/archive-runtime/fish-04.png", x: 795, y: 4407, width: 132, height: 84, delay: -1040, duration: 2520, tilt: 0.75, jitter: 0.14 },
] as const;
const motionAssets = [cleanBaseAsset.src, ...fishAssets.map(({ src }) => src)];
const position = (asset: { x: number; y: number; width: number; height: number }) => ({
  left: `${asset.x / masterWidth * 100}%`,
  top: `${asset.y / masterHeight * 100}%`,
  width: `${asset.width / masterWidth * 100}%`,
  height: `${asset.height / masterHeight * 100}%`,
}) as CSSProperties;

export function ArchiveFishFloatMotion({ preview = false }: { preview?: boolean }) {
  const trigger = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const entered = useRef(false);
  const enabled = H5_MOTION_ENABLED && h5MotionModules.archiveFishFloat && !preview;

  useEffect(() => {
    if (!enabled) {
      setMotionAllowed(false);
      setReady(false);
      setFallback(true);
      return;
    }
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const sync = () => {
      const allowed = !media?.matches;
      setMotionAllowed(allowed);
      if (!allowed) {
        setReady(false);
        setFallback(true);
      }
    };
    sync();
    if (!media) return;
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }
    media.addListener?.(sync);
    return () => media.removeListener?.(sync);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === "undefined") {
      setFallback(true);
      setVisible(false);
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
    if (state === "loading") setReady(false);
    if (state === "ready") {
      setReady(true);
      setFallback(false);
    }
    if (state === "disabled" || state === "failed" || state === "reduced") {
      setReady(false);
      setFallback(true);
    }
  }, []);
  const staticFish = null;

  return <div className={`archive-fish-float ${ready ? "is-ready" : ""} ${visible ? "is-visible" : ""} ${fallback ? "is-fallback" : ""}`} data-motion-module="archiveFishFloat" aria-hidden="true">
    <div ref={trigger} className="archive-fish-float-trigger" />
    {motionAllowed && <MotionBoundary fallback={staticFish}>
      <MotionStage masterWidth={masterWidth} masterHeight={masterHeight} assets={motionAssets} enabled={enabled} crossfadeMs={0} fallback={staticFish} onStateChange={onStateChange}>
        <Image className="archive-fish-clean-patch" src={cleanBaseAsset.src} alt="" width={cleanBaseAsset.width} height={cleanBaseAsset.height} unoptimized style={position(cleanBaseAsset)} />
        {fishAssets.map((fish, index) => <Image key={fish.src} className="archive-fish-float-layer" data-fish-index={index + 1} src={fish.src} alt="" width={fish.width} height={fish.height} unoptimized style={{ ...position(fish), "--archive-fish-delay": `${fish.delay}ms`, "--archive-fish-duration": `${fish.duration}ms`, "--archive-fish-tilt": `${fish.tilt}deg`, "--archive-fish-jitter": `${fish.jitter}deg` } as CSSProperties} />)}
      </MotionStage>
    </MotionBoundary>}
  </div>;
}
