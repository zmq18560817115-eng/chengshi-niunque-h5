"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { MotionBoundary } from "@/components/h5/motion/MotionBoundary";
import { MotionStage } from "@/components/h5/motion/MotionStage";
import { H5_MOTION_ENABLED, h5MotionModules } from "@/components/h5/motion/motion-config";

type TitleGroup = {
  slug: "inspection-projects" | "review-assurance" | "production-traceability";
  label: string;
  gif: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

const masterWidth = 1000;
const masterHeight = 5557;

const titleGroups: readonly TitleGroup[] = [
  {
    slug: "inspection-projects",
    label: "检测项目",
    gif: "/design/final-v1/检测项目_逐字跳动.gif",
    left: 486,
    top: 2788,
    width: 439.5,
    height: 102.5,
  },
  {
    slug: "review-assurance",
    label: "复核保障",
    gif: "/design/final-v1/复核保障_逐字跳动.gif",
    left: 87.5,
    top: 3165,
    width: 439,
    height: 102,
  },
  {
    slug: "production-traceability",
    label: "生产溯源",
    gif: "/design/final-v1/生产溯源_逐字跳动.gif",
    left: 472,
    top: 3522.5,
    width: 439.5,
    height: 103,
  },
] as const;

const position = (group: TitleGroup) => ({
  left: `${group.left / masterWidth * 100}%`,
  top: `${group.top / masterHeight * 100}%`,
  width: `${group.width / masterWidth * 100}%`,
  aspectRatio: `${group.width} / ${group.height}`,
}) as CSSProperties;

function ArchiveSectionTitleGroup({ group, enabled }: { group: TitleGroup; enabled: boolean }) {
  const trigger = useRef<HTMLDivElement>(null);
  const [nearby, setNearby] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

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

  const handleMotionState = useCallback((state: "disabled" | "loading" | "ready" | "failed" | "reduced") => {
    setReady(state === "ready");
  }, []);

  return (
    <div className="archive-section-title-group" data-title-group={group.slug} data-title-label={group.label} data-title-nearby={nearby} data-title-visible={visible} data-title-ready={ready} style={position(group)}>
      <div ref={trigger} className="archive-section-title-trigger" />
      {nearby && <MotionBoundary fallback={null}>
        <MotionStage masterWidth={group.width} masterHeight={group.height} assets={[group.gif]} enabled={enabled} crossfadeMs={0} fallback={null} onStateChange={handleMotionState}>
          {ready && visible && <Image className="archive-section-title-layer archive-section-title-gif" src={group.gif} alt="" fill sizes="(max-width: 750px) 44vw, 330px" unoptimized />}
        </MotionStage>
      </MotionBoundary>}
    </div>
  );
}

export function ArchiveSectionTitleMotion({ preview = false }: { preview?: boolean }) {
  const enabled = H5_MOTION_ENABLED && h5MotionModules.archiveSectionTitle && !preview;
  if (!enabled) return null;

  return (
    <div className="archive-section-title-motion" data-motion-module="archiveSectionTitle" aria-hidden="true">
      {titleGroups.map((group) => <ArchiveSectionTitleGroup key={group.slug} group={group} enabled={enabled} />)}
    </div>
  );
}
