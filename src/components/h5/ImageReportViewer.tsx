"use client";

import { useRef, useState, type TouchEvent } from "react";
import Image from "next/image";
import type { PublicAsset } from "@/server/services/public-content-service";

export function ImageReportViewer({ asset }: { asset: PublicAsset }) {
  const [scale, setScale] = useState(1);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [retry, setRetry] = useState(0);
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null);

  const touchDistance = (event: TouchEvent<HTMLDivElement>) => {
    const [first, second] = [event.touches[0], event.touches[1]];
    return first && second ? Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY) : 0;
  };

  return <article className="image-report" data-scale={scale}>
    <header>
      <div><h2>{asset.title}</h2>{asset.description && <p>{asset.description}</p>}</div>
      <div className="report-zoom-controls" aria-label="图片缩放">
        <button type="button" onClick={() => setScale((value) => Math.max(1, value - .25))} aria-label="缩小报告图片" disabled={scale === 1}>−</button>
        <output aria-live="polite">{Math.round(scale * 100)}%</output>
        <button type="button" onClick={() => setScale((value) => Math.min(3, value + .25))} aria-label="放大报告图片" disabled={scale === 3}>＋</button>
      </div>
    </header>
    {failed ? <div className="report-error" role="alert"><strong>{asset.title}</strong><p>资料加载失败</p><button type="button" onClick={() => { setFailed(false); setLoaded(false); setRetry((value) => value + 1); }}>重新加载</button></div> :
      <div className={`report-image-stage ${loaded ? "is-loaded" : "is-loading"}`} onDoubleClick={() => setScale((value) => value === 1 ? 2 : 1)}
        onTouchStart={(event) => { if (event.touches.length === 2) pinchStart.current = { distance: touchDistance(event), scale }; }}
        onTouchMove={(event) => { if (event.touches.length !== 2 || !pinchStart.current) return; const distance = touchDistance(event); if (!distance || !pinchStart.current.distance) return; setScale(Math.min(3, Math.max(1, pinchStart.current.scale * distance / pinchStart.current.distance))); }}
        onTouchEnd={(event) => { if (event.touches.length < 2) pinchStart.current = null; }}>
        {!loaded && <div className="report-image-skeleton" aria-hidden="true"/>}
        <div className="report-image-scroll"><Image key={retry} unoptimized width={1200} height={1600} src={asset.href} alt={asset.title} style={{ width: `${scale * 100}%` }} onLoad={() => setLoaded(true)} onError={() => setFailed(true)}/></div>
      </div>}
  </article>;
}
