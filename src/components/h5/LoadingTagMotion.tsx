"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
import { designAssets } from "@/config/design-assets.generated";
import { H5_MOTION_ENABLED } from "./motion/motion-config";

const artwork = designAssets.loadingMotion;

export function LoadingTagMotion() {
  const clipId = useId();
  const [readyParts, setReadyParts] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!H5_MOTION_ENABLED) return;
    // SVG image load events may precede hydration. Decode the same cached
    // resources explicitly so the prepainted route buffer also becomes ready.
    let cancelled = false;
    const images = [artwork.base, artwork.label.src].map((src) => new Promise<void>((resolve, reject) => {
      const image = new window.Image();
      image.onload = () => { if (image.decode) void image.decode().then(() => resolve(), reject); else resolve(); };
      image.onerror = reject;
      image.src = src;
    }));
    void Promise.all(images).then(() => { if (!cancelled) setReadyParts(3); }, () => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);
  if (!H5_MOTION_ENABLED) return null;
  const { label, track } = artwork;
  const ready = readyParts === 3 && !failed;
  const style = { "--loading-label-travel": `${artwork.travel}px`, "--loading-fill-start": artwork.initialFill / track.width } as CSSProperties;
  return <svg className="guide-loading-motion" viewBox={`0 0 ${artwork.width} ${artwork.height}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" data-loading-motion-ready={ready} style={style}>
    <defs><clipPath id={clipId}><rect x={track.x} y={track.y} width={track.width} height={track.height} rx={track.height / 2}/></clipPath></defs>
    <image href={artwork.base} width={artwork.width} height={artwork.height} onLoad={() => setReadyParts((value) => value | 1)} onError={() => setFailed(true)}/>
    <g clipPath={`url(#${clipId})`}><rect className="guide-loading-progress-fill" x={track.x} y={track.y} width={track.width} height={track.height}/></g>
    <image className="guide-loading-label" href={label.src} x={label.x} y={label.y} width={label.width} height={label.height} onLoad={() => setReadyParts((value) => value | 2)} onError={() => setFailed(true)}/>
  </svg>;
}
