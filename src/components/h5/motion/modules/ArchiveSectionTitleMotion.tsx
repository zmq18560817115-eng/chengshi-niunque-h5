"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { MotionBoundary } from "@/components/h5/motion/MotionBoundary";
import { MotionStage } from "@/components/h5/motion/MotionStage";
import { H5_MOTION_ENABLED, h5MotionModules } from "@/components/h5/motion/motion-config";

type TitleGroup = {
  slug: "inspection-projects" | "review-assurance" | "production-traceability";
  label: string;
  poster: string;
  left: number;
  top: number;
  width: number;
  height: number;
  numberParts: readonly PositionedAsset[];
};

type PositionedRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};
type PositionedGif = PositionedRect & { gif: string };
type PositionedAsset = {
  src: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

const masterWidth = 1000;
const masterHeight = 5557;
const archiveMotionRoot = "/design/final-v1/motion/archive-runtime";
export const archiveTitleBounceDurationMs = 1217;

const clickCue: PositionedGif = {
  gif: `${archiveMotionRoot}/section-click-cue.gif`,
  left: 533,
  top: 2545.5,
  width: 420,
  height: 206,
};

const titleGroups: readonly TitleGroup[] = [
  {
    slug: "inspection-projects",
    label: "检测项目",
    poster: `${archiveMotionRoot}/section-title-inspection-poster.webp`,
    left: 556,
    top: 2779.5,
    width: 379,
    height: 114.5,
    numberParts: [
      { src: `${archiveMotionRoot}/section-number-inspection-ring.png`, left: 475, top: 2787.5, width: 80.5, height: 84.5 },
      { src: `${archiveMotionRoot}/section-number-inspection-digit.png`, left: 497, top: 2803, width: 25.5, height: 57 },
    ],
  },
  {
    slug: "review-assurance",
    label: "复核保障",
    poster: `${archiveMotionRoot}/section-title-review-poster.webp`,
    left: 94,
    top: 3155.5,
    width: 378.5,
    height: 114,
    numberParts: [
      { src: `${archiveMotionRoot}/section-number-review-ring.png`, left: 10.5, top: 3168, width: 80.5, height: 84.5 },
      { src: `${archiveMotionRoot}/section-number-review-digit.png`, left: 28, top: 3181.5, width: 43.5, height: 55 },
    ],
  },
  {
    slug: "production-traceability",
    label: "生产溯源",
    poster: `${archiveMotionRoot}/section-title-production-poster.webp`,
    left: 542.5,
    top: 3518,
    width: 379,
    height: 115,
    numberParts: [
      { src: `${archiveMotionRoot}/section-number-production-ring.png`, left: 468.5, top: 3532.5, width: 80.5, height: 84.5 },
      { src: `${archiveMotionRoot}/section-number-production-digit.png`, left: 487.5, top: 3543, width: 40.5, height: 59 },
    ],
  },
] as const;

export const archiveSectionTitleWarmAssets = [
  clickCue.gif,
  ...titleGroups.flatMap((group) => [group.poster, ...group.numberParts.map((part) => part.src)]),
] as const;

const position = (group: PositionedRect) => ({
  left: `${group.left / masterWidth * 100}%`,
  top: `${group.top / masterHeight * 100}%`,
  width: `${group.width / masterWidth * 100}%`,
  height: `${group.height / masterHeight * 100}%`,
}) as CSSProperties;

const positionWithin = (group: TitleGroup, part: PositionedAsset) => ({
  left: `${(part.left - group.left) / group.width * 100}%`,
  top: `${(part.top - group.top) / group.height * 100}%`,
  width: `${part.width / group.width * 100}%`,
  height: `${part.height / group.height * 100}%`,
}) as CSSProperties;

function useViewportPresence(enabled: boolean) {
  const trigger = useRef<HTMLDivElement>(null);
  const [nearby, setNearby] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === "undefined") {
      setNearby(false);
      setVisible(false);
      return;
    }
    const node = trigger.current;
    if (!node) return;
    const preloadObserver = new IntersectionObserver(([entry]) => {
      setNearby(entry.isIntersecting);
    }, { threshold: 0, rootMargin: "45% 0px" });
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.05);
    }, { threshold: [0, 0.05] });
    preloadObserver.observe(node);
    visibilityObserver.observe(node);
    return () => {
      preloadObserver.disconnect();
      visibilityObserver.disconnect();
    };
  }, [enabled]);

  return { trigger, nearby, visible };
}

function useViewportGif(enabled: boolean) {
  const presence = useViewportPresence(enabled);
  const [ready, setReady] = useState(false);

  const handleMotionState = useCallback((state: "disabled" | "loading" | "ready" | "failed" | "reduced") => {
    setReady(state === "ready");
  }, []);

  return { ...presence, ready, handleMotionState };
}

function useSequentialTitlePlayback(enabled: boolean) {
  const trigger = useRef<HTMLDivElement>(null);
  const [regionVisible, setRegionVisible] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const sync = () => setMotionAllowed(!(media?.matches ?? false));
    sync();
    if (!media) return;
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }
    media.addListener?.(sync);
    return () => media.removeListener?.(sync);
  }, []);

  useEffect(() => {
    const node = trigger.current;
    if (!enabled || !node || typeof IntersectionObserver === "undefined") {
      setRegionVisible(false);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setRegionVisible(entry.isIntersecting);
    }, { threshold: 0, rootMargin: "16% 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  return { trigger, running: enabled && motionAllowed && regionVisible };
}

function ArchiveSectionClickCue({ enabled, active }: { enabled: boolean; active: boolean }) {
  const { trigger, nearby, visible, ready, handleMotionState } = useViewportGif(enabled);

  return (
    <div className={`archive-section-click-cue ${active ? "archive-module-pressed-layer" : ""}`} data-click-cue-nearby={nearby} data-click-cue-visible={visible} data-click-cue-ready={ready} style={position(clickCue)}>
      <div ref={trigger} className="archive-section-title-trigger" />
      {nearby && <MotionBoundary fallback={null}>
        <MotionStage masterWidth={clickCue.width} masterHeight={clickCue.height} assets={[clickCue.gif]} enabled={enabled} crossfadeMs={0} fallback={null} onStateChange={handleMotionState}>
          {ready && visible && <Image className="archive-section-title-layer archive-section-click-cue-gif" src={clickCue.gif} alt="" fill sizes="(max-width: 750px) 42vw, 315px" unoptimized />}
        </MotionStage>
      </MotionBoundary>}
    </div>
  );
}

function ArchiveSectionTitleGroup({ group, active, exiting, sequenceIndex }: { group: TitleGroup; active: boolean; exiting: boolean; sequenceIndex: number }) {
  const groupStyle = { ...position(group), "--archive-title-sequence-index": sequenceIndex } as CSSProperties;

  return (
    <div className={`archive-section-title-group ${active ? "archive-module-pressed-layer" : ""} ${exiting ? "archive-module-exit-layer" : ""}`} data-title-group={group.slug} data-title-label={group.label} data-title-ready="true" data-title-sequence-order={sequenceIndex + 1} data-title-render-layer="poster" style={groupStyle}>
      <Image className="archive-section-title-layer archive-section-title-poster" src={group.poster} alt="" fill sizes="(max-width: 750px) 44vw, 330px" unoptimized />
      {group.numberParts.map((part) => (
        <Image
          key={part.src}
          className="archive-section-number-part"
          src={part.src}
          alt=""
          width={part.width * 2}
          height={part.height * 2}
          style={positionWithin(group, part)}
          sizes="(max-width: 750px) 9vw, 68px"
          unoptimized
        />
      ))}
    </div>
  );
}

export function ArchiveSectionTitleMotion({ preview = false, activeSlug = null, exitingSlug = null }: { preview?: boolean; activeSlug?: string | null; exitingSlug?: string | null }) {
  const enabled = H5_MOTION_ENABLED && h5MotionModules.archiveSectionTitle && !preview;
  const { trigger, running } = useSequentialTitlePlayback(enabled);
  if (!enabled) return null;

  return (
    <div className="archive-section-title-motion" data-motion-module="archiveSectionTitle" data-title-sequence-running={running} data-title-sequence-mode={running ? "css-compositor-loop" : "paused"} aria-hidden="true">
      <div ref={trigger} className="archive-section-title-sequence-trigger" />
      <ArchiveSectionClickCue enabled={enabled} active={activeSlug === "inspection-projects"} />
      {titleGroups.map((group, index) => <ArchiveSectionTitleGroup key={group.slug} group={group} active={group.slug === activeSlug} exiting={group.slug === exitingSlug} sequenceIndex={index} />)}
    </div>
  );
}
