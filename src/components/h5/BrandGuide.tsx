"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { replaceHierarchyRoute } from "./hierarchy-navigation";
import { H5_MOTION_ENABLED, h5MotionModules, h5MotionTiming } from "./motion/motion-config";
import {
  guideRouteDestinationSrc,
  guideRouteNavigationDelayMs,
  getGuideTransitionVisualState,
  navigateWithGuideContinuity,
  primeGuideRouteContinuity,
  prepareGuideRouteContinuity,
} from "./guide-route-transition";

type AssetStatus = "loading" | "ready" | "failed" | "reduced" | "disabled";
type GuideMotionPreference = "unknown" | "allowed" | "reduced";
type GuideDestinationStatus = "loading" | "ready" | "fallback";
type GuideLayoutProfile = "unknown" | "portrait-standard" | "portrait-compact" | "landscape";
const GUIDE_SWIPE_DISTANCE_PX = 24;
const GUIDE_SWIPE_COMMIT_PROGRESS = 0.12;
const GUIDE_SWIPE_FAST_VELOCITY = 0.55;
const GUIDE_GESTURE_AXIS_LOCK_PX = 8;
const GUIDE_GESTURE_SETTLE_MS = 240;

type GuideGesture = {
  source: "pointer" | "touch";
  id: number;
  startX: number;
  startY: number;
  lastY: number;
  lastAt: number;
  velocity: number;
  axis: "pending" | "horizontal" | "vertical";
};

const clampProgress = (value: number) => Math.min(1, Math.max(0, value));

const assetUrl = (name: string) => `/design/guide/${name}`;
const standardLayerNames = [
  "guide-character-open.webp", "guide-character-closed.webp", "guide-arch.webp",
  "report-paper-top.webp", "report-paper-left.webp", "report-paper-right.webp", "report-paper-bottom.webp",
  "guide-foreground-top.webp",
] as const;
const standardReadyKeys = [...standardLayerNames, "standard-hint"] as const;
const landscapeReadyKeys = [
  "landscape-logo", "landscape-character-arch", "landscape-character-open",
  "landscape-character-foreground", "landscape-envelope", "landscape-hint",
] as const;

function markImageDecoded(image: HTMLImageElement, key: string, onReady: (key: string) => void, onError: (name: string) => void) {
  const ready = () => onReady(key);
  if (typeof image.decode === "function") void image.decode().then(ready, () => onError(key));
  else ready();
}

function GuideFallback({ unavailable, onError }: { unavailable: boolean; onError: () => void }) {
  return <>
    {!unavailable && (
      <Image className="brand-guide-fallback" src={assetUrl("guide-static-foreground.webp")} alt="诚实纽雀品牌引导" width={750} height={1625} sizes="(orientation: portrait) 100vw, 1px" priority fetchPriority="high" unoptimized decoding="async" onError={onError}/>
    )}
      <span className="brand-guide-fallback-message" aria-hidden={!unavailable}>上滑查看完整营养信息</span>
  </>;
}

function GuideLayers({ onReady, onError }: { onReady: (key: string) => void; onError: (name: string) => void }) {
  const image = (name: (typeof standardLayerNames)[number], className: string, high = false) => <Image key={name} className={className} src={assetUrl(name)} alt="" width={750} height={1625} sizes="(orientation: portrait) 100vw, 1px" priority={high} fetchPriority={high ? "high" : "auto"} unoptimized decoding="async" onLoad={(event) => markImageDecoded(event.currentTarget, name, onReady, onError)} onError={() => onError(name)}/>;
  return <div className="brand-guide-dynamic-stage is-animated-canvas">
    {image("guide-character-open.webp", "brand-guide-character brand-guide-character-open", true)}
    {image("guide-character-closed.webp", "brand-guide-character brand-guide-character-closed")}
    {image("guide-arch.webp", "brand-guide-arch", true)}
    {image("report-paper-top.webp", "brand-guide-paper brand-guide-paper-top", true)}
    {image("report-paper-left.webp", "brand-guide-paper brand-guide-paper-left", true)}
    {image("report-paper-right.webp", "brand-guide-paper brand-guide-paper-right", true)}
    {image("report-paper-bottom.webp", "brand-guide-paper brand-guide-paper-bottom", true)}
    {image("guide-foreground-top.webp", "brand-guide-foreground-top", true)}
  </div>;
}

function GuideEntryHint({ onReady, onError }: { onReady: (key: string) => void; onError: (name: string) => void }) {
  return <Image className="brand-guide-entry-hint" src={assetUrl("swipe-up-hint-v2.png")} alt="" aria-hidden="true" width={868} height={260} sizes="(max-width: 750px) 43.4vw, 326px" priority unoptimized decoding="async" onLoad={(event) => markImageDecoded(event.currentTarget, "standard-hint", onReady, onError)} onError={() => onError("swipe-up-hint-v2.png")}/>;
}

function GuideLandscapeCrop({ name, src, readyKey, onReady, onError }: { name: "logo" | "envelope"; src: string; readyKey: string; onReady: (key: string) => void; onError: (name: string) => void }) {
  return <div className={`guide-landscape-crop guide-landscape-${name}`} data-guide-landmark={name}>
    <Image className="guide-landscape-crop-master" src={src} alt="" aria-hidden="true" width={750} height={1625} sizes="(orientation: landscape) 100vw, 1px" priority unoptimized decoding="async" onLoad={(event) => markImageDecoded(event.currentTarget, readyKey, onReady, onError)} onError={() => onError(src.split("/").at(-1) ?? src)}/>
  </div>;
}

function GuideLandscapeCharacter({ onReady, onError }: { onReady: (key: string) => void; onError: (name: string) => void }) {
  const layers = ["guide-arch.webp", "guide-character-open.webp", "guide-foreground-top.webp"] as const;
  return <div className="guide-landscape-crop guide-landscape-character" data-guide-landmark="character">
    {layers.map((name, index) => <Image
      key={name}
      className={`guide-landscape-crop-master is-${name.replace(".webp", "")}`}
      src={assetUrl(name)}
      alt=""
      aria-hidden="true"
      width={750}
      height={1625}
      sizes="(max-width: 750px) 54vw, 405px"
      priority
      unoptimized
      decoding="async"
      onLoad={(event) => markImageDecoded(event.currentTarget, ["landscape-character-arch", "landscape-character-open", "landscape-character-foreground"][index]!, onReady, onError)}
      onError={() => onError(name)}
    />)}
  </div>;
}

function GuideLandscapeComposition({ onReady, onError }: { onReady: (key: string) => void; onError: (name: string) => void }) {
  return <div className="guide-landscape-composition" aria-hidden="true">
    <GuideLandscapeCrop name="logo" src={assetUrl("guide-foreground-top.webp")} readyKey="landscape-logo" onReady={onReady} onError={onError}/>
    <GuideLandscapeCharacter onReady={onReady} onError={onError}/>
    <GuideLandscapeCrop name="envelope" src={assetUrl("guide-foreground-top.webp")} readyKey="landscape-envelope" onReady={onReady} onError={onError}/>
    <Image className="guide-landscape-hint" data-guide-landmark="hint" src={assetUrl("swipe-up-hint-v2.png")} alt="" aria-hidden="true" width={868} height={260} sizes="(orientation: landscape) 27vw, 1px" priority unoptimized decoding="async" onLoad={(event) => markImageDecoded(event.currentTarget, "landscape-hint", onReady, onError)} onError={() => onError("swipe-up-hint-v2.png")}/>
  </div>;
}

function GuideDestinationPreview({ onReady, onError }: { onReady: () => void; onError: () => void }) {
  return <section className="brand-guide-destination-preview" aria-hidden="true">
    <div className="brand-guide-destination-content">
      <Image
        className="brand-guide-destination-image"
        src={guideRouteDestinationSrc}
        alt=""
        width={750}
        height={1625}
        sizes="(max-width: 750px) 100vw, 750px"
        priority
        fetchPriority="high"
        unoptimized
        decoding="async"
        onLoad={(event) => {
          const image = event.currentTarget;
          if (typeof image.decode === "function") void image.decode().then(onReady, onError);
          else onReady();
        }}
        onError={onError}
      />
    </div>
  </section>;
}

export function BrandGuide({ preview = false, onEnter }: { preview?: boolean; onEnter?: () => void }) {
  const router = useRouter();
  const motionEnabled = H5_MOTION_ENABLED && h5MotionModules.guide && !preview;
  const [leaving, setLeaving] = useState(false);
  const [assetStatus, setAssetStatus] = useState<AssetStatus>(motionEnabled ? "loading" : "disabled");
  const [motionPreference, setMotionPreference] = useState<GuideMotionPreference>("unknown");
  const [layoutProfile, setLayoutProfile] = useState<GuideLayoutProfile>("unknown");
  const [fallbackUnavailable, setFallbackUnavailable] = useState(false);
  const [animationStarted, setAnimationStarted] = useState(false);
  const [swipeReady, setSwipeReady] = useState(!motionEnabled);
  const [gestureReady, setGestureReady] = useState(!motionEnabled);
  const [destinationStatus, setDestinationStatus] = useState<GuideDestinationStatus>(preview ? "ready" : "loading");
  const [continuityReady, setContinuityReady] = useState(preview);
  const [transitionError, setTransitionError] = useState(false);
  const destinationUsable = destinationStatus !== "loading";
  const transitionSwipeReady = swipeReady && destinationUsable && continuityReady;
  const transitionGestureReady = gestureReady && destinationUsable && continuityReady;
  const requiredReadyKeys = useMemo<readonly string[]>(() => {
    if (layoutProfile === "portrait-standard" || layoutProfile === "portrait-compact") return standardReadyKeys;
    if (layoutProfile === "landscape") return landscapeReadyKeys;
    return [];
  }, [layoutProfile]);
  const guideRoot = useRef<HTMLElement | null>(null);
  const readyLayers = useRef(new Set<string>());
  const readyFrames = useRef<number[]>([]);
  const animationTimer = useRef<number | null>(null);
  const gesture = useRef<GuideGesture | null>(null);
  const swipeProgress = useRef(0);
  const queuedProgress = useRef<number | null>(null);
  const progressFrame = useRef<number | null>(null);
  const settleFrame = useRef<number | null>(null);
  const settleTimer = useRef<number | null>(null);
  const entering = useRef(false);
  const orientation = useRef<"portrait" | "landscape" | null>(null);

  useEffect(() => {
    const sync = () => {
      const nextOrientation = window.innerWidth > window.innerHeight ? "landscape" : "portrait";
      // Mobile browser chrome repeatedly changes the visual viewport height.
      // Keep the selected composition stable until the device orientation itself changes.
      if (orientation.current === nextOrientation) return;
      orientation.current = nextOrientation;
      if (nextOrientation === "landscape") setLayoutProfile("landscape");
      else setLayoutProfile(window.innerWidth / Math.max(1, window.innerHeight) >= 12 / 25 ? "portrait-compact" : "portrait-standard");
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  useEffect(() => {
    readyLayers.current.clear();
    readyFrames.current.forEach((frame) => window.cancelAnimationFrame(frame));
    readyFrames.current = [];
    if (animationTimer.current !== null) window.clearTimeout(animationTimer.current);
    animationTimer.current = null;
    if (motionEnabled && motionPreference === "allowed") {
      setAssetStatus("loading");
      setAnimationStarted(false);
      setSwipeReady(false);
      setGestureReady(false);
    }
  }, [layoutProfile, motionEnabled, motionPreference]);

  const handleLayerReady = useCallback((key: string) => {
    if (!motionEnabled || motionPreference !== "allowed" || !requiredReadyKeys.includes(key)) return;
    readyLayers.current.add(key);
    if (!requiredReadyKeys.every((required) => readyLayers.current.has(required))) return;
    const firstFrame = window.requestAnimationFrame(() => {
      const secondFrame = window.requestAnimationFrame(() => {
        setAssetStatus("ready");
        animationTimer.current = window.setTimeout(() => {
          setAnimationStarted(true);
          animationTimer.current = null;
        }, h5MotionTiming.guide.crossfadeMs);
      });
      readyFrames.current.push(secondFrame);
    });
    readyFrames.current.push(firstFrame);
  }, [motionEnabled, motionPreference, requiredReadyKeys]);

  const applyGuideProgress = useCallback((nextProgress: number) => {
    const root = guideRoot.current;
    if (!root) return;
    const progress = clampProgress(nextProgress);
    const viewportHeight = Math.max(1, root.getBoundingClientRect().height || window.visualViewport?.height || window.innerHeight);
    const visual = getGuideTransitionVisualState(progress, viewportHeight);
    swipeProgress.current = progress;
    root.style.setProperty("--guide-swipe-guide-y", `${visual.guideY.toFixed(3)}px`);
    root.style.setProperty("--guide-swipe-destination-y", `${visual.destinationY.toFixed(3)}px`);
    root.style.setProperty("--guide-swipe-guide-opacity", `${visual.guideOpacity.toFixed(4)}`);
    root.style.setProperty("--guide-swipe-destination-opacity", `${visual.destinationOpacity.toFixed(4)}`);
    root.dataset.swipeProgress = progress.toFixed(3);
  }, []);

  const flushGuideProgress = useCallback((progress: number) => {
    if (progressFrame.current !== null) window.cancelAnimationFrame(progressFrame.current);
    progressFrame.current = null;
    queuedProgress.current = null;
    applyGuideProgress(progress);
  }, [applyGuideProgress]);

  const scheduleGuideProgress = useCallback((progress: number) => {
    queuedProgress.current = progress;
    if (progressFrame.current !== null) return;
    // Mark the frame as pending before requesting it so synchronous RAF mocks
    // cannot leave a stale frame id behind after the callback has already run.
    progressFrame.current = -1;
    const frameId = window.requestAnimationFrame(() => {
      progressFrame.current = null;
      const nextProgress = queuedProgress.current;
      queuedProgress.current = null;
      if (nextProgress !== null) applyGuideProgress(nextProgress);
    });
    if (progressFrame.current === -1) progressFrame.current = frameId;
  }, [applyGuideProgress]);

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
    if (preview || layoutProfile === "unknown" || !destinationUsable) return;
    let cancelled = false;
    setContinuityReady(false);
    void primeGuideRouteContinuity(layoutProfile, destinationStatus === "fallback").then((ready) => {
      if (!cancelled) setContinuityReady(ready);
    });
    return () => { cancelled = true; };
  }, [destinationStatus, destinationUsable, layoutProfile, preview]);

  useEffect(() => {
    if (!animationStarted) return;
    const timer = window.setTimeout(() => {
      setSwipeReady(true);
      setGestureReady(true);
    }, h5MotionTiming.guide.swipeReadyMs);
    return () => window.clearTimeout(timer);
  }, [animationStarted]);

  const enter = useCallback((source: "gesture" | "control", progress = swipeProgress.current) => {
    const ready = source === "gesture" ? transitionGestureReady : transitionSwipeReady;
    if (entering.current || leaving || preview || !ready) return;
    entering.current = true;
    const startProgress = source === "gesture" ? clampProgress(progress) : 0;
    flushGuideProgress(startProgress);
    guideRoot.current?.classList.remove("is-dragging", "is-settling");
    setTransitionError(false);
    const continueToArchive = async () => {
      if (!onEnter) {
        const prepared = await prepareGuideRouteContinuity(startProgress, destinationStatus === "fallback");
        if (!prepared) {
          entering.current = false;
          setDestinationStatus("fallback");
          setTransitionError(true);
          flushGuideProgress(0);
          return;
        }
      }
      setLeaving(true);
      const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      window.setTimeout(() => {
        if (onEnter) onEnter();
        else navigateWithGuideContinuity(() => replaceHierarchyRoute(router, "/reports"));
      }, reducedMotion ? 0 : guideRouteNavigationDelayMs);
    };
    void continueToArchive();
  }, [destinationStatus, flushGuideProgress, leaving, onEnter, preview, router, transitionGestureReady, transitionSwipeReady]);

  const settleGuide = useCallback(() => {
    const root = guideRoot.current;
    if (!root) return;
    if (settleFrame.current !== null) window.cancelAnimationFrame(settleFrame.current);
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    root.classList.remove("is-dragging");
    root.classList.add("is-settling");
    root.dataset.swipeInteraction = "settling";
    settleFrame.current = window.requestAnimationFrame(() => {
      settleFrame.current = window.requestAnimationFrame(() => {
        settleFrame.current = null;
        flushGuideProgress(0);
      });
    });
    settleTimer.current = window.setTimeout(() => {
      settleTimer.current = null;
      root.classList.remove("is-settling");
      root.dataset.swipeInteraction = "idle";
    }, GUIDE_GESTURE_SETTLE_MS + 34);
  }, [flushGuideProgress]);

  const beginGesture = useCallback((source: GuideGesture["source"], id: number, x: number, y: number, at: number) => {
    const root = guideRoot.current;
    if (!root || entering.current || leaving || preview || !transitionGestureReady || gesture.current) return false;
    if (settleFrame.current !== null) window.cancelAnimationFrame(settleFrame.current);
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    settleFrame.current = null;
    settleTimer.current = null;
    root.classList.remove("is-settling");
    root.classList.add("is-dragging");
    root.dataset.swipeInteraction = "dragging";
    gesture.current = {
      source,
      id,
      startX: x,
      startY: y,
      lastY: y,
      lastAt: at,
      velocity: 0,
      axis: "pending",
    };
    return true;
  }, [leaving, preview, transitionGestureReady]);

  const moveGesture = useCallback((source: GuideGesture["source"], id: number, x: number, y: number, at: number) => {
    const current = gesture.current;
    const root = guideRoot.current;
    if (!current || !root || current.source !== source || current.id !== id) return false;
    const deltaX = x - current.startX;
    const upwardDistance = current.startY - y;
    if (current.axis === "pending" && Math.max(Math.abs(deltaX), Math.abs(upwardDistance)) >= GUIDE_GESTURE_AXIS_LOCK_PX) {
      current.axis = Math.abs(upwardDistance) > Math.abs(deltaX) ? "vertical" : "horizontal";
    }
    if (current.axis === "horizontal") return false;
    const elapsed = Math.max(1, at - current.lastAt);
    const instantaneousVelocity = (current.lastY - y) / elapsed;
    current.velocity = current.velocity * 0.62 + instantaneousVelocity * 0.38;
    current.lastY = y;
    current.lastAt = at;
    const viewportHeight = Math.max(1, root.getBoundingClientRect().height || window.visualViewport?.height || window.innerHeight);
    scheduleGuideProgress(clampProgress(Math.max(0, upwardDistance) / viewportHeight));
    return current.axis === "vertical";
  }, [scheduleGuideProgress]);

  const finishGesture = useCallback((source: GuideGesture["source"], id: number, x: number, y: number, at: number, cancelled = false) => {
    const current = gesture.current;
    const root = guideRoot.current;
    if (!current || !root || current.source !== source || current.id !== id) return;
    moveGesture(source, id, x, y, at);
    const upwardDistance = Math.max(0, current.startY - y);
    const viewportHeight = Math.max(1, root.getBoundingClientRect().height || window.visualViewport?.height || window.innerHeight);
    const progress = current.axis === "vertical" ? clampProgress(upwardDistance / viewportHeight) : 0;
    flushGuideProgress(progress);
    gesture.current = null;
    root.classList.remove("is-dragging");
    const shouldEnter = !cancelled
      && current.axis === "vertical"
      && upwardDistance >= GUIDE_SWIPE_DISTANCE_PX
      && (progress >= GUIDE_SWIPE_COMMIT_PROGRESS || current.velocity >= GUIDE_SWIPE_FAST_VELOCITY);
    if (shouldEnter) enter("gesture", progress);
    else settleGuide();
  }, [enter, flushGuideProgress, moveGesture, settleGuide]);

  useEffect(() => () => {
    if (progressFrame.current !== null) window.cancelAnimationFrame(progressFrame.current);
    if (settleFrame.current !== null) window.cancelAnimationFrame(settleFrame.current);
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    readyFrames.current.forEach((frame) => window.cancelAnimationFrame(frame));
    if (animationTimer.current !== null) window.clearTimeout(animationTimer.current);
  }, []);

  const handleLayerError = useCallback((name: string) => {
    console.error(`[BrandGuide] asset failed: ${name}`);
    setAssetStatus("failed");
    setAnimationStarted(false);
    setSwipeReady(true);
    setGestureReady(true);
  }, []);
  const handleFallbackError = useCallback(() => {
    console.error("[BrandGuide] asset failed: guide-static-foreground.webp");
    setFallbackUnavailable(true);
    setSwipeReady(true);
    setGestureReady(true);
  }, []);
  const handleDestinationError = useCallback(() => {
    console.error(`[BrandGuide] asset failed: ${guideRouteDestinationSrc}`);
    setDestinationStatus("fallback");
  }, []);
  const fallback = <GuideFallback unavailable={fallbackUnavailable} onError={handleFallbackError}/>;
  const mountLivePortrait = layoutProfile !== "landscape" && layoutProfile !== "unknown" && motionEnabled && motionPreference === "allowed";
  const motionStyle = {
    "--guide-blink-start": `${h5MotionTiming.guide.blinkStartMs}ms`,
    "--guide-blink-duration": `${h5MotionTiming.guide.blinkDurationMs}ms`,
    "--guide-paper-start": `${h5MotionTiming.guide.paperStartMs}ms`,
    "--guide-paper-duration": `${h5MotionTiming.guide.paperDurationMs}ms`,
  } as CSSProperties;

  return <main ref={guideRoot} data-motion-module="guide" data-guide-profile={layoutProfile} data-swipe-progress="0.000" data-swipe-interaction="idle" className={`brand-guide is-${assetStatus} ${motionEnabled ? "is-motion-enabled" : "is-motion-disabled"} ${animationStarted ? "is-animating" : ""} ${leaving ? "is-leaving" : ""} ${fallbackUnavailable ? "has-no-fallback" : ""} ${destinationStatus === "fallback" ? "has-destination-fallback" : ""}`}
    onPointerDown={(event) => {
      if (event.pointerType === "touch" && gesture.current?.source === "pointer" && gesture.current.id !== event.pointerId) {
        const current = gesture.current;
        finishGesture("pointer", current.id, current.startX, current.lastY, event.timeStamp, true);
        if (event.currentTarget.hasPointerCapture?.(current.id)) event.currentTarget.releasePointerCapture?.(current.id);
        return;
      }
      if (!event.isPrimary || event.button !== 0) return;
      const startedOnEnterControl = event.target instanceof Element && Boolean(event.target.closest(".brand-guide-enter-action"));
      if (beginGesture("pointer", event.pointerId, event.clientX, event.clientY, event.timeStamp) && !startedOnEnterControl) {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }
    }}
    onPointerMove={(event) => {
      if (moveGesture("pointer", event.pointerId, event.clientX, event.clientY, event.timeStamp)) event.preventDefault();
    }}
    onPointerUp={(event) => {
      finishGesture("pointer", event.pointerId, event.clientX, event.clientY, event.timeStamp);
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture?.(event.pointerId);
    }}
    onPointerCancel={(event) => finishGesture("pointer", event.pointerId, event.clientX, event.clientY, event.timeStamp, true)}
    onTouchStart={(event) => {
      if (gesture.current?.source === "touch" && event.touches.length > 1) {
        const current = gesture.current;
        finishGesture("touch", current.id, current.startX, current.lastY, event.timeStamp, true);
        return;
      }
      if (gesture.current || event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (touch) beginGesture("touch", touch.identifier, touch.clientX, touch.clientY, event.timeStamp);
    }}
    onTouchMove={(event) => {
      const current = gesture.current;
      if (!current || current.source !== "touch") return;
      const touches = Array.from(event.touches);
      const touch = touches.find((item) => item.identifier === current.id);
      if (touch && moveGesture("touch", current.id, touch.clientX, touch.clientY, event.timeStamp)) event.preventDefault();
    }}
    onTouchEnd={(event) => {
      const current = gesture.current;
      if (!current || current.source !== "touch") return;
      const touches = Array.from(event.changedTouches);
      const touch = touches.find((item) => item.identifier === current.id);
      if (touch) finishGesture("touch", current.id, touch.clientX, touch.clientY, event.timeStamp);
    }}
    onTouchCancel={(event) => {
      const current = gesture.current;
      if (!current || current.source !== "touch") return;
      const touches = Array.from(event.changedTouches);
      const touch = touches.find((item) => item.identifier === current.id);
      finishGesture("touch", current.id, touch?.clientX ?? current.startX, touch?.clientY ?? current.lastY, event.timeStamp, true);
    }}>
    <div className="brand-guide-swipe-track">
      <section className="brand-guide-stage" style={motionStyle} aria-label="品牌引导页" data-load-state={assetStatus} data-animation-state={motionEnabled ? (animationStarted ? "running" : "paused") : "disabled"} data-swipe-state={transitionSwipeReady ? "ready" : "locked"} data-gesture-state={transitionGestureReady ? "ready" : "locked"} data-destination-state={destinationStatus} data-swipe-distance-px={GUIDE_SWIPE_DISTANCE_PX} data-swipe-commit-progress={GUIDE_SWIPE_COMMIT_PROGRESS} data-blink-start-ms={h5MotionTiming.guide.blinkStartMs} data-blink-hold-ms={h5MotionTiming.guide.blinkHoldMs} data-blink-duration-ms={h5MotionTiming.guide.blinkDurationMs} data-paper-start-ms={h5MotionTiming.guide.paperStartMs} data-paper-duration-ms={h5MotionTiming.guide.paperDurationMs} data-swipe-ready-ms={h5MotionTiming.guide.swipeReadyMs}>
        <div className="brand-guide-artwork" data-guide-layout={layoutProfile}>
          {layoutProfile !== "landscape" && <>
            <div className="brand-guide-portrait-scene">
              {fallback}
              {mountLivePortrait && <div className="brand-guide-live-stage">
                <GuideLayers onReady={handleLayerReady} onError={handleLayerError}/>
                <GuideEntryHint onReady={handleLayerReady} onError={handleLayerError}/>
              </div>}
            </div>
          </>}
          {layoutProfile === "landscape" && <GuideLandscapeComposition onReady={handleLayerReady} onError={handleLayerError}/>}
        </div>
        {transitionError && <p className="brand-guide-transition-error" role="alert">档案预览加载失败，请再次上滑或点击重试</p>}
        <h1 className="brand-guide-accessible-copy">Honest Nutri 品牌引导</h1>
        <small className="brand-guide-accessible-copy">{preview ? "后台预览" : "向上滑动，或点击下方提示进入档案"}</small>
        <button className="brand-guide-enter-action" type="button" onClick={() => enter("control", 0)} disabled={leaving || preview || !transitionSwipeReady}>进入档案</button>
      </section>
      <GuideDestinationPreview onReady={() => setDestinationStatus("ready")} onError={handleDestinationError}/>
    </div>
  </main>;
}
