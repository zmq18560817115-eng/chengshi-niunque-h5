"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";

const assets = [
  "/design/final-v1/archive-module1-circle-canvas.webp",
  "/design/final-v1/archive-module1-pass-canvas.webp",
  "/design/final-v1/archive-module1-unlock-canvas.webp",
] as const;

function preload(name: string) {
  const image = new window.Image();
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
  });
  image.src = name;
  const decoded = typeof image.decode === "function" ? image.decode() : Promise.resolve();
  return Promise.all([loaded, decoded]).then(() => undefined);
}

export function ArchiveModuleOne({ preview = false }: { preview?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "failed">("loading");
  const [started, setStarted] = useState(false);
  const [unlockProgress, setUnlockProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void Promise.all(assets.map(preload)).then(() => { if (!cancelled) setLoadState("ready"); }).catch(() => { if (!cancelled) setLoadState("failed"); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (loadState !== "ready") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const completed = sessionStorage.getItem("archive-module-1-complete") === "true";
    if (reduced || completed || preview) {
      setStarted(true);
      setUnlockProgress(1);
      return;
    }
    const target = root.current;
    if (!target || typeof IntersectionObserver === "undefined") {
      setStarted(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entry.intersectionRatio < .25) return;
      setStarted(true);
      sessionStorage.setItem("archive-module-1-complete", "true");
      observer.disconnect();
    }, { threshold: [.25] });
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadState, preview]);

  useEffect(() => {
    if (!started || preview || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const update = () => setUnlockProgress(Math.min(1, Math.max(0, (window.scrollY - 30) / 70)));
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [preview, started]);

  if (loadState === "failed") return null;
  return <div ref={root} className={`archive-module-one is-${loadState} ${started ? "is-started" : ""}`} data-animation-state={started ? "running" : "paused"} style={{ "--unlock-progress": unlockProgress } as CSSProperties} aria-hidden="true">
    <Image className="archive-module-layer archive-module-circle" src="/design/final-v1/archive-module1-circle-canvas.webp" alt="" fill unoptimized/>
    <Image className="archive-module-layer archive-module-result-passed" src="/design/final-v1/archive-module1-pass-canvas.webp" alt="" fill unoptimized/>
    <Image className="archive-module-layer archive-module-unlock" src="/design/final-v1/archive-module1-unlock-canvas.webp" alt="" fill unoptimized/>
  </div>;
}
