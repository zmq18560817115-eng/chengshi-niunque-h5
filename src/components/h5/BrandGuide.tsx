"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MotionBoundary } from "./motion/MotionBoundary";
import { MotionStage } from "./motion/MotionStage";
import { H5_MOTION_ENABLED, h5MotionModules, h5MotionTiming } from "./motion/motion-config";

type AssetStatus = "loading" | "ready" | "failed" | "reduced" | "disabled";
type GuideMotionPreference = "unknown" | "allowed" | "reduced";

const guideAssetNames = [
  "guide-background.webp", "guide-arch.webp",
  "guide-character-open.webp", "guide-character-closed.webp", "guide-window-mask.webp", "guide-foreground-top.webp",
  "report-paper-top.webp", "report-paper-left.webp", "report-paper-right.webp", "report-paper-bottom.webp",
  "swipe-hint-text.webp", "swipe-hint-arrow.webp", "guide-final-fallback.webp",
] as const;
const assetUrl = (name: string) => `/design/guide/${name}`;
const guideAssets = guideAssetNames.map(assetUrl);

function GuideFallback({ unavailable, onError }: { unavailable: boolean; onError: () => void }) {
  return <>
    {!unavailable && (
      <Image className="brand-guide-fallback" src={assetUrl("guide-final-fallback.webp")} alt="诚实纽雀品牌引导" fill sizes="(max-width: 750px) 100vw, 750px" priority fetchPriority="high" unoptimized decoding="async" onError={onError}/>
    )}
      <span className="brand-guide-fallback-message" aria-hidden={!unavailable}>向左滑动进入</span>
  </>;
}

function GuideLayers({ animated, onError }: { animated: boolean; onError: (name: string) => void }) {
  const image = (name: (typeof guideAssetNames)[number], className: string, high = false) => <Image key={name} className={className} src={assetUrl(name)} alt="" fill sizes="(max-width: 750px) 100vw, 750px" priority={high} fetchPriority={high ? "high" : "auto"} unoptimized decoding="async" onError={() => onError(name)}/>;
  return <div className={`brand-guide-dynamic-stage ${animated ? "is-animated-canvas" : "is-initial-canvas"}`}>
    {image("guide-background.webp", "brand-guide-base", true)}
    {image("guide-character-open.webp", "brand-guide-character brand-guide-character-open", true)}
    {animated && image("guide-character-closed.webp", "brand-guide-character brand-guide-character-closed")}
    {image("guide-window-mask.webp", "brand-guide-window-mask", true)}
    {image("guide-arch.webp", "brand-guide-arch", true)}
    {animated && <>
      {image("report-paper-top.webp", "brand-guide-paper brand-guide-paper-top")}
      {image("report-paper-left.webp", "brand-guide-paper brand-guide-paper-left")}
      {image("report-paper-right.webp", "brand-guide-paper brand-guide-paper-right")}
      {image("report-paper-bottom.webp", "brand-guide-paper brand-guide-paper-bottom")}
      <div className="brand-guide-swipe-hint" aria-hidden="true">
        <Image className="brand-guide-swipe-text" src={assetUrl("swipe-hint-text.webp")} alt="" width={750} height={1625} sizes="42vw" unoptimized decoding="async" onError={() => onError("swipe-hint-text.webp")}/>
        <Image className="brand-guide-swipe-arrow" src={assetUrl("swipe-hint-arrow.webp")} alt="" width={750} height={1625} sizes="42vw" unoptimized decoding="async" onError={() => onError("swipe-hint-arrow.webp")}/>
      </div>
    </>}
    {image("guide-foreground-top.webp", "brand-guide-foreground-top", true)}
  </div>;
}

function GuideBootstrapFrame({ onLayerError, onFinalFallbackError }: { onLayerError: (name: string) => void; onFinalFallbackError: () => void }) {
  return <div className="brand-guide-bootstrap-frame">
    <GuideLayers animated={false} onError={onLayerError}/>
    <Image className="brand-guide-bootstrap-reduced" src={assetUrl("guide-final-fallback.webp")} alt="诚实纽雀品牌引导" fill sizes="(max-width: 750px) 100vw, 750px" fetchPriority="high" unoptimized decoding="async" onError={onFinalFallbackError}/>
  </div>;
}

export function BrandGuide({ preview = false, onEnter }: { preview?: boolean; onEnter?: () => void }) {
  const router = useRouter();
  const motionEnabled = H5_MOTION_ENABLED && h5MotionModules.guide && !preview;
  const [leaving, setLeaving] = useState(false);
  const [assetStatus, setAssetStatus] = useState<AssetStatus>(motionEnabled ? "loading" : "disabled");
  const [motionPreference, setMotionPreference] = useState<GuideMotionPreference>("unknown");
  const [fallbackUnavailable, setFallbackUnavailable] = useState(false);
  const [animationStarted, setAnimationStarted] = useState(false);
  const [swipeReady, setSwipeReady] = useState(!motionEnabled);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const entering = useRef(false);

  useEffect(() => {
    if (!motionEnabled) return;
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const sync = () => {
      const nextPreference = media?.matches ? "reduced" : "allowed";
      setMotionPreference(nextPreference);
      setAssetStatus(nextPreference === "reduced" ? "reduced" : "loading");
      setAnimationStarted(false);
      setSwipeReady(nextPreference === "reduced");
    };
    sync();
    if (!media) return;
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }
    media.addListener?.(sync);
    return () => media.removeListener?.(sync);
  }, [motionEnabled]);

  useEffect(() => {
    if (!preview && !onEnter) router.prefetch("/reports");
  }, [onEnter, preview, router]);

  useEffect(() => {
    if (!animationStarted) return;
    const timer = window.setTimeout(() => setSwipeReady(true), h5MotionTiming.guide.swipeReadyMs);
    return () => window.clearTimeout(timer);
  }, [animationStarted]);

  const enter = useCallback(() => {
    if (entering.current || leaving || preview || !swipeReady) return;
    entering.current = true;
    setLeaving(true);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    window.setTimeout(() => onEnter ? onEnter() : router.push("/reports"), reducedMotion ? 150 : 460);
  }, [leaving, onEnter, preview, router, swipeReady]);

  const handleLayerError = useCallback((name: string) => {
    console.error(`[BrandGuide] asset failed: ${name}`);
    setAssetStatus("failed");
    setAnimationStarted(false);
    setSwipeReady(true);
  }, []);
  const handleFallbackError = useCallback(() => {
    console.error("[BrandGuide] asset failed: guide-final-fallback.webp");
    setFallbackUnavailable(true);
    setSwipeReady(true);
  }, []);
  const handleMotionBoundaryError = useCallback(() => {
    setAssetStatus("failed");
    setAnimationStarted(false);
    setSwipeReady(true);
  }, []);
  const handleMotionState = useCallback((state: AssetStatus) => {
    setAssetStatus(state);
    if (state === "loading" || state === "failed" || state === "reduced" || state === "disabled") setAnimationStarted(false);
    if (state === "failed" || state === "reduced" || state === "disabled") setSwipeReady(true);
  }, []);
  const startAnimation = useCallback(() => setAnimationStarted(true), []);
  const fallback = <GuideFallback unavailable={fallbackUnavailable} onError={handleFallbackError}/>;
  const bootstrapFrame = <GuideBootstrapFrame onLayerError={handleLayerError} onFinalFallbackError={handleFallbackError}/>;
  const firstFrame = <GuideLayers animated={false} onError={handleLayerError}/>;
  const mountMotionStage = motionEnabled && motionPreference === "allowed";
  const motionStyle = {
    "--guide-blink-start": `${h5MotionTiming.guide.blinkStartMs}ms`,
    "--guide-blink-duration": `${h5MotionTiming.guide.blinkDurationMs}ms`,
    "--guide-paper-start": `${h5MotionTiming.guide.paperStartMs}ms`,
    "--guide-paper-duration": `${h5MotionTiming.guide.paperDurationMs}ms`,
    "--guide-hint-start": `${h5MotionTiming.guide.hintStartMs}ms`,
    "--guide-hint-duration": `${h5MotionTiming.guide.hintDurationMs}ms`,
  } as CSSProperties;

  return <main data-motion-module="guide" className={`brand-guide is-${assetStatus} ${motionEnabled ? "is-motion-enabled" : "is-motion-disabled"} ${animationStarted ? "is-animating" : ""} ${leaving ? "is-leaving" : ""} ${fallbackUnavailable ? "has-no-fallback" : ""}`}
    onTouchStart={(event) => {
      const touch = event.touches[0];
      touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    }}
    onTouchEnd={(event) => {
      const start = touchStart.current;
      const touch = event.changedTouches[0];
      touchStart.current = null;
      if (!start || !touch || !swipeReady) return;
      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;
      if (deltaX <= -50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) enter();
    }}>
    <section className="brand-guide-stage" style={motionStyle} aria-label="品牌引导页" data-load-state={assetStatus} data-animation-state={motionEnabled ? (animationStarted ? "running" : "paused") : "disabled"} data-swipe-state={swipeReady ? "ready" : "locked"} data-blink-start-ms={h5MotionTiming.guide.blinkStartMs} data-blink-hold-ms={h5MotionTiming.guide.blinkHoldMs} data-blink-duration-ms={h5MotionTiming.guide.blinkDurationMs} data-paper-start-ms={h5MotionTiming.guide.paperStartMs} data-paper-duration-ms={h5MotionTiming.guide.paperDurationMs} data-hint-start-ms={h5MotionTiming.guide.hintStartMs} data-hint-duration-ms={h5MotionTiming.guide.hintDurationMs} data-swipe-ready-ms={h5MotionTiming.guide.swipeReadyMs}>
      {mountMotionStage ? <MotionBoundary fallback={fallback} onError={handleMotionBoundaryError}>
        <MotionStage masterWidth={750} masterHeight={1625} assets={guideAssets} enabled crossfadeMs={h5MotionTiming.guide.crossfadeMs} fallback={fallback} loadingFallback={firstFrame} onStateChange={handleMotionState} onAnimationReady={startAnimation}>
          <GuideLayers animated onError={handleLayerError}/>
        </MotionStage>
      </MotionBoundary> : motionEnabled && motionPreference === "unknown" ? bootstrapFrame : fallback}
      <h1 className="brand-guide-accessible-copy">Honest Nutri 品牌引导</h1>
      <small className="brand-guide-accessible-copy">{preview ? "后台预览" : "向左滑动，或点击滑动提示进入档案"}</small>
      <button className="brand-guide-enter-action" type="button" onClick={enter} disabled={leaving || preview || !swipeReady}>进入档案</button>
    </section>
  </main>;
}
