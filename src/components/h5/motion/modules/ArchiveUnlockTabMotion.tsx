"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { archiveEntryMasterHeight, archiveEntryRibbon } from "@/components/h5/archive-entry-transition-visual";
import { H5_MOTION_ENABLED, h5MotionModules, h5MotionTiming } from "../motion-config";

const tabAsset = archiveEntryRibbon.src;
export const archiveUnlockWarmAssets = [tabAsset] as const;

// Only the original ribbon slides into place; its document anchor never moves.
export function ArchiveUnlockTabMotion({ preview = false, enabled = true, active = true, startedAt }: { preview?: boolean; enabled?: boolean; active?: boolean; startedAt?: number }) {
  const clip = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const motionEnabled = enabled && H5_MOTION_ENABLED && h5MotionModules.archiveUnlockTab && !preview;
  const settled = useRef(!motionEnabled);
  const [state, setState] = useState<"hidden" | "entering" | "fixed">(motionEnabled ? "hidden" : "fixed");
  const [enterDelay, setEnterDelay] = useState(0);

  useEffect(() => {
    const node = clip.current;
    if (!node) return;
    const complete = () => { settled.current = true; setState("fixed"); };
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!motionEnabled || media?.matches || typeof IntersectionObserver === "undefined") {
      complete();
      return;
    }
    if (!active || !ready || settled.current) return;
    if (startedAt !== undefined) {
      const elapsed = Math.max(0, performance.now() - startedAt);
      const remaining = h5MotionTiming.archiveUnlockTab.enterDurationMs - elapsed;
      if (remaining <= 0) { complete(); return; }
      setEnterDelay(-elapsed);
      setState("entering");
      const timer = window.setTimeout(complete, remaining + 50);
      const reduceMotion = () => { if (media?.matches) { window.clearTimeout(timer); complete(); } };
      media?.addEventListener?.("change", reduceMotion);
      return () => {
        window.clearTimeout(timer);
        media?.removeEventListener?.("change", reduceMotion);
      };
    }
    let timer: number | undefined;
    let started = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (started || !entry.isIntersecting) return;
      started = true;
      setState("entering");
      observer.disconnect();
      timer = window.setTimeout(complete, h5MotionTiming.archiveUnlockTab.enterDurationMs + 50);
    }, { threshold: 0 });
    const reduceMotion = () => {
      if (!media?.matches) return;
      observer.disconnect();
      window.clearTimeout(timer);
      complete();
    };
    observer.observe(node);
    media?.addEventListener?.("change", reduceMotion);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      media?.removeEventListener?.("change", reduceMotion);
    };
  }, [active, motionEnabled, ready, startedAt]);

  const style = {
    "--archive-ribbon-left": `${archiveEntryRibbon.left / 10}%`,
    "--archive-ribbon-top": `${archiveEntryRibbon.top / archiveEntryMasterHeight * 100}%`,
    "--archive-ribbon-width": `${archiveEntryRibbon.width / 10}%`,
    "--archive-ribbon-height": `${archiveEntryRibbon.height / archiveEntryMasterHeight * 100}%`,
    "--archive-ribbon-enter-duration": `${h5MotionTiming.archiveUnlockTab.enterDurationMs}ms`,
    "--archive-ribbon-enter-delay": `${enterDelay}ms`,
  } as CSSProperties;
  return <div data-motion-module="archiveUnlockTab" className={`archive-unlock-tab-motion ${ready ? "is-ready" : ""}`} style={style} data-unlock-state={state} data-unlock-progress="1.000" data-unlock-ready={ready} data-preview={preview || undefined} aria-hidden="true">
    <div ref={clip} className="archive-unlock-tab-clip">
      <Image className="archive-unlock-tab-image" src={tabAsset} alt="" width={archiveEntryRibbon.width * 2} height={archiveEntryRibbon.height * 2} loading="eager" sizes="(max-width: 750px) 7.9vw, 59.25px" unoptimized onLoad={() => setReady(true)} />
    </div>
  </div>;
}
