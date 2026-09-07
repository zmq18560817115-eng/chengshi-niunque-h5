"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { designAssets } from "@/config/design-assets.generated";
import { archiveTitleGroups } from "@/config/h5-archive-modules";
import { H5_MOTION_ENABLED, h5MotionModules } from "@/components/h5/motion/motion-config";

export const archiveTitleBounceDurationMs = 1217;
const titleGroups = archiveTitleGroups;
export const archiveSectionTitleWarmAssets = titleGroups.flatMap((group) => [group.cue.src, ...group.parts.map((part) => part.src)]);
const position = (part: { x: number; y: number; width: number; height: number }): CSSProperties => ({ left: `${part.x / designAssets.archiveWidth * 100}%`, top: `${part.y / designAssets.archiveHeight * 100}%`, width: `${part.width / designAssets.archiveWidth * 100}%`, height: `${part.height / designAssets.archiveHeight * 100}%` });

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

export function ArchiveSectionTitleMotion({ preview = false, activeSlug = null }: { preview?: boolean; activeSlug?: string | null }) {
  const enabled = H5_MOTION_ENABLED && h5MotionModules.archiveSectionTitle && !preview;
  const { trigger, running } = useSequentialTitlePlayback(enabled);
  return <div className="archive-section-title-motion" data-motion-module="archiveSectionTitle" data-title-sequence-running={running} data-title-sequence-mode={running ? "css-compositor-loop" : "paused"} aria-hidden="true">
    <div ref={trigger} className="archive-section-title-sequence-trigger" />
    {titleGroups.map((group, sequenceIndex) => <div key={group.slug} data-title-group={group.slug} data-title-label={group.label} data-title-ready="true" data-title-sequence-order={sequenceIndex + 1} data-title-render-layer="source-characters">
      <div className={`archive-section-click-cue ${activeSlug === group.slug ? "archive-module-pressed-layer" : ""}`} style={position(group.cue)} data-cue-module={group.slug}>
        <Image className="archive-section-click-cue-image" src={group.cue.src} alt="" fill unoptimized loading="eager" />
      </div>
      {group.parts.map((part, characterIndex) => <div key={part.src} className={`archive-section-character-slot ${activeSlug === group.slug ? "archive-module-pressed-layer" : ""}`} style={position(part)}>
        <Image className="archive-section-title-character" src={part.src} alt="" fill unoptimized loading="eager" data-title-character={characterIndex} style={{ "--archive-title-sequence-index": sequenceIndex, "--archive-title-character-index": characterIndex } as CSSProperties} />
      </div>)}
    </div>)}
  </div>;
}
