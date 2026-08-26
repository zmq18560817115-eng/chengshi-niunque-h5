"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MotionBoundary } from "./motion/MotionBoundary";
import { MotionStage } from "./motion/MotionStage";
import { H5_MOTION_ENABLED, h5MotionModules, h5MotionTiming } from "./motion/motion-config";
import { guideRouteNavigationDelayMs, navigateWithGuideContinuity, prepareGuideRouteContinuity } from "./guide-route-transition";

type AssetStatus = "loading" | "ready" | "failed" | "reduced" | "disabled";
type GuideMotionPreference = "unknown" | "allowed" | "reduced";
const GUIDE_SWIPE_DISTANCE_PX = 24;

const isUpwardGuideSwipe = (start: { x: number; y: number }, current: { x: number; y: number }) => {
  const deltaX = current.x - start.x;
  const deltaY = current.y - start.y;
  return deltaY <= -GUIDE_SWIPE_DISTANCE_PX && Math.abs(deltaY) > Math.abs(deltaX);
};

const guideAssetNames = [
  "guide-background.webp", "guide-arch.webp",
  "guide-character-open.webp", "guide-character-closed.webp", "guide-window-mask.webp", "guide-foreground-top.webp",
  "report-paper-top.webp", "report-paper-left.webp", "report-paper-right.webp", "report-paper-bottom.webp",
  "swipe-up-hint-v2.png",
] as const;
const assetUrl = (name: string) => `/design/guide/${name}`;
const guideAssets = guideAssetNames.map(assetUrl);
export const guideWarmAssets = [...guideAssets, assetUrl("guide-final-fallback-v3.webp")] as const;

function GuideFallback({ unavailable, onError }: { unavailable: boolean; onError: () => void }) {
  return <>
    {!unavailable && (
      <Image className="brand-guide-fallback" src={assetUrl("guide-final-fallback-v3.webp")} alt="诚实纽雀品牌引导" fill sizes="(max-width: 750px) 100vw, 750px" priority fetchPriority="high" unoptimized decoding="async" onError={onError}/>
    )}
      <span className="brand-guide-fallback-message" aria-hidden={!unavailable}>上滑查看完整营养信息</span>
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
      {image("report-paper-top.webp", "brand-guide-paper brand-guide-paper-top", true)}
      {image("report-paper-left.webp", "brand-guide-paper brand-guide-paper-left", true)}
      {image("report-paper-right.webp", "brand-guide-paper brand-guide-paper-right", true)}
      {image("report-paper-bottom.webp", "brand-guide-paper brand-guide-paper-bottom", true)}
    </>}
    {image("guide-foreground-top.webp", "brand-guide-foreground-top", true)}
  </div>;
}

function GuideEntryHint({ onError }: { onError: (name: string) => void }) {
  return <Image className="brand-guide-entry-hint" src={assetUrl("swipe-up-hint-v2.png")} alt="" aria-hidden="true" width={868} height={260} sizes="(max-width: 750px) 43.4vw, 326px" priority unoptimized decoding="async" onError={() => onError("swipe-up-hint-v2.png")}/>;
}

function GuideBootstrapFrame({ onLayerError, onFinalFallbackError }: { onLayerError: (name: string) => void; onFinalFallbackError: () => void }) {
  return <div className="brand-guide-bootstrap-frame">
    <GuideLayers animated={false} onError={onLayerError}/>
    <Image className="brand-guide-bootstrap-reduced" src={assetUrl("guide-final-fallback-v3.webp")} alt="诚实纽雀品牌引导" fill sizes="(max-width: 750px) 100vw, 750px" fetchPriority="high" unoptimized decoding="async" onError={onFinalFallbackError}/>
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
  const [gestureReady, setGestureReady] = useState(!motionEnabled);
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
      setGestureReady(nextPreference === "reduced");
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

  const enter = useCallback((source: "gesture" | "control") => {
    const ready = source === "gesture" ? gestureReady : swipeReady;
    if (entering.current || leaving || preview || !ready) return;
    entering.current = true;
    if (!onEnter) prepareGuideRouteContinuity();
    setLeaving(true);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    window.setTimeout(() => {
      if (onEnter) onEnter();
      else navigateWithGuideContinuity(() => router.push("/reports"));
    }, reducedMotion ? 0 : guideRouteNavigationDelayMs);
  }, [gestureReady, leaving, onEnter, preview, router, swipeReady]);

  const handleLayerError = useCallback((name: string) => {
    console.error(`[BrandGuide] asset failed: ${name}`);
    setAssetStatus("failed");
    setAnimationStarted(false);
    setSwipeReady(true);
    setGestureReady(true);
  }, []);
  const handleFallbackError = useCallback(() => {
    console.error("[BrandGuide] asset failed: guide-final-fallback-v3.webp");
    setFallbackUnavailable(true);
    setSwipeReady(true);
    setGestureReady(true);
  }, []);
  const handleMotionBoundaryError = useCallback(() => {
    setAssetStatus("failed");
    setAnimationStarted(false);
    setSwipeReady(true);
    setGestureReady(true);
  }, []);
  const handleMotionState = useCallback((state: AssetStatus) => {
    setAssetStatus(state);
    if (state === "loading" || state === "failed" || state === "reduced" || state === "disabled") setAnimationStarted(false);
    if (state === "ready") setGestureReady(true);
    if (state === "failed" || state === "reduced" || state === "disabled") {
      setSwipeReady(true);
      setGestureReady(true);
    }
  }, []);
  const startAnimation = useCallback(() => {
    setAnimationStarted(true);
    setGestureReady(true);
  }, []);
  const fallback = <GuideFallback unavailable={fallbackUnavailable} onError={handleFallbackError}/>;
  const bootstrapFrame = <GuideBootstrapFrame onLayerError={handleLayerError} onFinalFallbackError={handleFallbackError}/>;
  const firstFrame = <GuideLayers animated={false} onError={handleLayerError}/>;
  const mountMotionStage = motionEnabled && motionPreference === "allowed";
  const motionStyle = {
    "--guide-blink-start": `${h5MotionTiming.guide.blinkStartMs}ms`,
    "--guide-blink-duration": `${h5MotionTiming.guide.blinkDurationMs}ms`,
    "--guide-paper-start": `${h5MotionTiming.guide.paperStartMs}ms`,
    "--guide-paper-duration": `${h5MotionTiming.guide.paperDurationMs}ms`,
  } as CSSProperties;

  return <main data-motion-module="guide" className={`brand-guide is-${assetStatus} ${motionEnabled ? "is-motion-enabled" : "is-motion-disabled"} ${animationStarted ? "is-animating" : ""} ${leaving ? "is-leaving" : ""} ${fallbackUnavailable ? "has-no-fallback" : ""}`}
    onTouchStart={(event) => {
      if (event.touches.length !== 1) {
        touchStart.current = null;
        return;
      }
      const touch = event.touches[0];
      touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    }}
    onTouchMove={(event) => {
      const start = touchStart.current;
      const touch = event.touches.length === 1 ? event.touches[0] : null;
      if (!start || !touch || !gestureReady) return;
      if (!isUpwardGuideSwipe(start, { x: touch.clientX, y: touch.clientY })) return;
      touchStart.current = null;
      enter("gesture");
    }}
    onTouchEnd={(event) => {
      const start = touchStart.current;
      const touch = event.changedTouches[0];
      touchStart.current = null;
      if (!start || !touch || !gestureReady) return;
      if (isUpwardGuideSwipe(start, { x: touch.clientX, y: touch.clientY })) enter("gesture");
    }}
    onTouchCancel={() => {
      touchStart.current = null;
    }}>
    <section className="brand-guide-stage" style={motionStyle} aria-label="品牌引导页" data-load-state={assetStatus} data-animation-state={motionEnabled ? (animationStarted ? "running" : "paused") : "disabled"} data-swipe-state={swipeReady ? "ready" : "locked"} data-gesture-state={gestureReady ? "ready" : "locked"} data-swipe-distance-px={GUIDE_SWIPE_DISTANCE_PX} data-blink-start-ms={h5MotionTiming.guide.blinkStartMs} data-blink-hold-ms={h5MotionTiming.guide.blinkHoldMs} data-blink-duration-ms={h5MotionTiming.guide.blinkDurationMs} data-paper-start-ms={h5MotionTiming.guide.paperStartMs} data-paper-duration-ms={h5MotionTiming.guide.paperDurationMs} data-swipe-ready-ms={h5MotionTiming.guide.swipeReadyMs}>
      {mountMotionStage ? <MotionBoundary fallback={fallback} onError={handleMotionBoundaryError}>
        <MotionStage masterWidth={750} masterHeight={1625} assets={guideAssets} enabled crossfadeMs={h5MotionTiming.guide.crossfadeMs} fallback={fallback} loadingFallback={firstFrame} onStateChange={handleMotionState} onAnimationReady={startAnimation}>
          <GuideLayers animated onError={handleLayerError}/>
        </MotionStage>
      </MotionBoundary> : motionEnabled && motionPreference === "unknown" ? bootstrapFrame : fallback}
      <GuideEntryHint onError={handleLayerError}/>
      <h1 className="brand-guide-accessible-copy">Honest Nutri 品牌引导</h1>
      <small className="brand-guide-accessible-copy">{preview ? "后台预览" : "向上滑动，或点击下方提示进入档案"}</small>
      <button className="brand-guide-enter-action" type="button" onClick={() => enter("control")} disabled={leaving || preview || !swipeReady}>进入档案</button>
    </section>
  </main>;
}
