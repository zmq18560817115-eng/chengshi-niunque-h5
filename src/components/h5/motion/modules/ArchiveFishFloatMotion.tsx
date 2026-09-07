"use client";

import Image from "next/image";
import { designAssets } from "@/config/design-assets.generated";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { MotionBoundary } from "../MotionBoundary";
import { MotionStage } from "../MotionStage";
import { H5_MOTION_ENABLED, h5MotionModules } from "../motion-config";

const masterWidth = designAssets.archiveWidth;
const masterHeight = designAssets.archiveHeight;
const cleanBaseAsset = designAssets.fishPatch;
const fishAssets = designAssets.fishParts;
const motionAssets = [cleanBaseAsset.src, ...fishAssets.map(({ src }) => src)];
export const archiveFishWarmAssets = motionAssets;
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
          <Image className="archive-fish-clean-patch" src={cleanBaseAsset.src} alt="" width={cleanBaseAsset.width} height={cleanBaseAsset.height} loading="eager" unoptimized style={position(cleanBaseAsset)} />
          {fishAssets.map((fish, index) => <Image key={fish.src} className="archive-fish-motion-gif" data-fish-index={index + 1} src={fish.src} alt="" width={fish.width} height={fish.height} loading="eager" unoptimized onError={handleGifError} style={position(fish)} />)}
        </>}
      </MotionStage>
    </MotionBoundary>}
  </div>;
}
