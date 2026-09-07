"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { guideArchiveEntryTiming } from "@/components/h5/guide-route-transition";
import { H5_MOTION_ENABLED, h5MotionModules } from "../motion-config";

type PaperState = "hidden" | "entering" | "complete";
const completedKey = (id: string) => `archive-folder-paper-${id}-v1`;
const wasCompleted = (id: string) => {
  try { return sessionStorage.getItem(completedKey(id)) === "true"; }
  catch { return false; }
};
const rememberCompleted = (id: string) => {
  try { sessionStorage.setItem(completedKey(id), "true"); }
  catch { /* In-app browsers can disable session storage. */ }
};

export function ArchiveFolderPaperMotion({ id, ready, preview, style, children }: {
  id: string; ready: boolean; preview: boolean; style: CSSProperties; children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const enabled = H5_MOTION_ENABLED && h5MotionModules.archiveFolderPaper && !preview;
  const [state, setState] = useState<PaperState>(enabled ? "hidden" : "complete");

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!enabled || media?.matches || wasCompleted(id) || typeof IntersectionObserver === "undefined") {
      setState("complete");
      return;
    }
    if (!ready) return;
    let started = false;
    let downwardScroll = window.scrollY > 0;
    let lastY = window.scrollY;
    let inView = false;
    let timer: number | undefined;
    const complete = () => {
      setState("complete");
      rememberCompleted(id);
    };
    const start = () => {
      if (started || !downwardScroll || !inView) return;
      started = true;
      setState("entering");
      // Remember once entry starts so returning from a category never hides
      // a paper again, even when navigation interrupted its last few frames.
      rememberCompleted(id);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      timer = window.setTimeout(complete, guideArchiveEntryTiming.batchDurationMs + 50);
    };
    const onScroll = () => {
      const nextY = window.scrollY;
      if (nextY > lastY + 1) downwardScroll = true;
      lastY = nextY;
      start();
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      start();
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0 });
    const onPreferenceChange = () => {
      if (!media?.matches) return;
      started = true;
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
      complete();
    };
    observer.observe(node);
    window.addEventListener("scroll", onScroll, { passive: true });
    media?.addEventListener?.("change", onPreferenceChange);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      media?.removeEventListener?.("change", onPreferenceChange);
      window.clearTimeout(timer);
    };
  }, [enabled, id, ready]);

  return <div ref={root} className="archive-folder-paper" data-paper-id={id} data-paper-state={state}
    style={{ ...style, "--archive-paper-enter-duration": `${guideArchiveEntryTiming.batchDurationMs}ms` } as CSSProperties}>
    {children}
  </div>;
}
