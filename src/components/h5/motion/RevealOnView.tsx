"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function RevealOnView({ children, threshold = .3 }: { children: ReactNode; threshold?: number }) {
  const root = useRef<HTMLDivElement>(null); const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (visible) return;
    const node = root.current; if (!node || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting && entry.intersectionRatio >= threshold) { setVisible(true); observer.disconnect(); } }, { threshold: [threshold] });
    observer.observe(node); return () => observer.disconnect();
  }, [threshold, visible]);
  return <div ref={root} data-motion-visible={visible}>{children}</div>;
}
