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
  { src: "/design/final-v1/motion/archive-runtime/fish-motion-01.gif", x: 54, y: 4408, width: 140.5, height: 88 },
  { src: "/design/final-v1/motion/archive-runtime/fish-motion-02.gif", x: 300, y: 4404.5, width: 140.5, height: 88 },
  { src: "/design/final-v1/motion/archive-runtime/fish-motion-03.gif", x: 543.5, y: 4407, width: 140.5, height: 88 },
  { src: "/design/final-v1/motion/archive-runtime/fish-motion-04.gif", x: 791, y: 4403, width: 140.5, height: 88 },
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
  const [nearby, setNearby] = useState(false);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const enabled = H5_MOTION_ENABLED && h5MotionModules.archiveFishFloat && !preview;

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === "undefined") {
      setNearby(false);
      setVisible(false);
      setReady(false);
      return;
    }
    const node = trigger.current;
    if (!node) return;
    const preloadObserver = new IntersectionObserver(([entry]) => {
      setNearby(entry.isIntersecting);
    }, { threshold: 0, rootMargin: "45% 0px" });
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.3);
    }, { threshold: [0, 0.3] });
    preloadObserver.observe(node);
    visibilityObserver.observe(node);
    return () => {
      preloadObserver.disconnect();
      visibilityObserver.disconnect();
    };
  }, [enabled]);

  const onStateChange = useCallback((state: "disabled" | "loading" | "ready" | "failed" | "reduced") => {
    setReady(state === "ready");
  }, []);
  const handleGifError = useCallback(() => setReady(false), []);
  const staticFish = null;

  return <div className={`archive-fish-float ${ready ? "is-ready" : ""} ${visible ? "is-visible" : ""}`} data-motion-module="archiveFishFloat" data-fish-nearby={nearby} data-fish-visible={visible} data-fish-ready={ready} aria-hidden="true">
    <div ref={trigger} className="archive-fish-float-trigger" />
    {nearby && <MotionBoundary fallback={staticFish}>
      <MotionStage masterWidth={masterWidth} masterHeight={masterHeight} assets={motionAssets} enabled={enabled} crossfadeMs={0} fallback={staticFish} onStateChange={onStateChange}>
        {ready && visible && <>
          <Image className="archive-fish-clean-patch" src={cleanBaseAsset.src} alt="" width={cleanBaseAsset.width} height={cleanBaseAsset.height} unoptimized style={position(cleanBaseAsset)} />
          {fishAssets.map((fish, index) => <Image key={fish.src} className="archive-fish-motion-gif" data-fish-index={index + 1} src={fish.src} alt="" width={281} height={176} unoptimized onError={handleGifError} style={position(fish)} />)}
        </>}
      </MotionStage>
    </MotionBoundary>}
  </div>;
}
