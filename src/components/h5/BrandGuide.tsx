"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { defaultH5SiteConfig, type H5SiteConfig } from "@/server/services/h5-site-config";

export function BrandGuide({ preview = false, onEnter, config = defaultH5SiteConfig }: { preview?: boolean; onEnter?: () => void; config?: H5SiteConfig }) {
  const [leaving, setLeaving] = useState(false);
  const startY = useRef<number | null>(null);
  const entering = useRef(false);
  const enter = useCallback(() => {
    if (entering.current || leaving || preview) return;
    entering.current = true;
    setLeaving(true);
    window.setTimeout(() => onEnter ? onEnter() : window.location.assign("/reports"), 260);
  }, [leaving, onEnter, preview]);

  useEffect(() => {
    if (preview) return;
    const timer = window.setTimeout(enter, config.guideDelaySeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [config.guideDelaySeconds, enter, preview]);

  return <main className={`brand-guide ${leaving ? "is-leaving" : ""}`} onClick={enter}
    onTouchStart={(event) => { startY.current = event.touches[0]?.clientY ?? null; }}
    onTouchEnd={(event) => { const end = event.changedTouches[0]?.clientY; if (startY.current !== null && end !== undefined && startY.current - end > 36) enter(); }}>
    <section aria-label="品牌引导页">
      <p className="eyebrow">{config.brandName}</p>
      <h1 className="display">{config.guideTitle.split("\n").map((line, index) => <span key={`${line}-${index}`}>{line}{index < config.guideTitle.split("\n").length - 1 && <br/>}</span>)}</h1>
      <p>{config.guideDescription}</p>
      <button type="button" onClick={enter}>{config.guideButtonText}</button>
      <small>{preview ? "后台预览 · 自动跳转已暂停" : `${config.guideDelaySeconds} 秒后自动进入`}</small>
    </section>
  </main>;
}
