"use client";

import Image from "next/image";
import { designAssets } from "@/config/design-assets.generated";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { H5_MOTION_ACCEPTANCE, H5_MOTION_ENABLED, h5MotionModules, h5MotionTiming } from "../motion-config";

const masterWidth = designAssets.archiveWidth;
const masterHeight = designAssets.archiveHeight;
const lineAssets = designAssets.storyLines;
const motionAssets = lineAssets.map(({ src }) => src);
export const archiveStoryWarmAssets = motionAssets;
const completedKey = "archive-story-copy-complete-v4";

const position = (asset: { x: number; y: number; width: number; height: number }) => ({
  left: `${asset.x / masterWidth * 100}%`,
  top: `${asset.y / masterHeight * 100}%`,
  width: `${asset.width / masterWidth * 100}%`,
  height: `${asset.height / masterHeight * 100}%`,
}) as CSSProperties;

const wasCompleted = () => {
  try { return sessionStorage.getItem(completedKey) === "true"; }
  catch { return false; }
};

const rememberCompleted = () => {
  try { sessionStorage.setItem(completedKey, "true"); }
  catch { /* Storage can be unavailable in hardened in-app browsers. */ }
};

const lineStartMs = (index: number) => (
  index * h5MotionTiming.archiveStoryCopy.lineStepMs
  + h5MotionTiming.archiveStoryCopy.lineOffsetsMs[index]
);

const totalDurationMs = h5MotionTiming.archiveStoryCopy.delayMs
  + Math.max(...lineAssets.map((_, index) => lineStartMs(index)))
  + h5MotionTiming.archiveStoryCopy.lineDurationMs;

function decodeLine(image: HTMLImageElement) {
  if (typeof image.decode === "function") return image.decode();
  if (image.complete) return image.naturalWidth > 0 ? Promise.resolve() : Promise.reject(new Error("Story image failed"));
  return new Promise<void>((resolve, reject) => {
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => reject(new Error("Story image failed")), { once: true });
  });
}

export function ArchiveStoryCopyMotion({ preview = false }: { preview?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [complete, setComplete] = useState(true);
  const manualScroll = useRef(false);
  const inView = useRef(false);
  const lastY = useRef(0);
  const armed = useRef(false);
  const remainingMs = useRef(totalDurationMs);
  const enabled = H5_MOTION_ENABLED && h5MotionModules.archiveStoryCopy && !preview;

  useEffect(() => {
    let cancelled = false;
    const images = Array.from(root.current?.querySelectorAll("img") ?? []);
    Promise.all(images.map(decodeLine)).then(() => {
      if (!cancelled) setReady(true);
    }).catch(() => {
      if (!cancelled) setComplete(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const restored = !H5_MOTION_ACCEPTANCE && wasCompleted();
    if (!enabled || reduced || restored || typeof IntersectionObserver === "undefined") {
      setComplete(true);
      return;
    }
    setComplete(false);
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
      setVisible(inView.current);
      if (manualScroll.current && inView.current) setStarted(true);
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
    if (!ready || !started || !visible || complete) return;
    const startedAt = performance.now();
    const timer = window.setTimeout(() => {
      remainingMs.current = 0;
      setComplete(true);
      rememberCompleted();
    }, remainingMs.current);
    return () => {
      clearTimeout(timer);
      remainingMs.current = Math.max(0, remainingMs.current - (performance.now() - startedAt));
    };
  }, [complete, ready, started, visible]);

  const style = {
    "--archive-story-delay": `${h5MotionTiming.archiveStoryCopy.delayMs}ms`,
    "--archive-story-duration": `${h5MotionTiming.archiveStoryCopy.lineDurationMs}ms`,
    "--archive-story-step": `${h5MotionTiming.archiveStoryCopy.lineStepMs}ms`,
    "--archive-story-easing": h5MotionTiming.archiveStoryCopy.easing,
  } as CSSProperties;

  return <div ref={root} data-motion-module="archiveStoryCopy" className={`archive-story-copy ${ready ? "is-ready" : ""} ${started ? "is-started" : ""} ${visible ? "is-visible" : ""} ${complete ? "is-complete" : ""}`} style={style} data-motion-ready={ready} data-motion-started={started} data-motion-visible={visible} data-motion-complete={complete}>
    <div ref={trigger} className="archive-story-copy-trigger"/>
    {lineAssets.map((line, index) => <Image key={line.src} className="archive-story-copy-line" data-story-line={index + 1} src={line.src} alt="" width={line.width} height={line.height} loading="eager" style={{ ...position(line), "--archive-story-index": index, "--archive-story-line-offset": `${h5MotionTiming.archiveStoryCopy.lineOffsetsMs[index]}ms` } as CSSProperties} unoptimized/>)}
  </div>;
}
