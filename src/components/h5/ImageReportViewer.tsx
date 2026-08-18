"use client";

import { useRef, useState, type TouchEvent } from "react";
import Image from "next/image";
import type { PublicAsset } from "@/server/services/public-content-service";

export function ImageReportViewer({ asset }: { asset: PublicAsset }) {
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [retry, setRetry] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const pinchStart = useRef<{ distance: number; scale: number; contentX: number; contentY: number; viewportX: number; viewportY: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  const touchDistance = (event: TouchEvent<HTMLDivElement>) => {
    const [first, second] = [event.touches[0], event.touches[1]];
    return first && second ? Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY) : 0;
  };

  const updateScale = (nextValue: number, focalPoint?: { x: number; y: number }) => {
    const stage = stageRef.current;
    const previous = scaleRef.current;
    const next = Math.min(3, Math.max(1, nextValue));
    if (next === previous) return;
    const point = focalPoint ?? { x: (stage?.clientWidth ?? 0) / 2, y: (stage?.clientHeight ?? 0) / 2 };
    const contentX = ((stage?.scrollLeft ?? 0) + point.x) / previous;
    const contentY = ((stage?.scrollTop ?? 0) + point.y) / previous;
    scaleRef.current = next;
    setScale(next);
    if (stage) requestAnimationFrame(() => { stage.scrollLeft = contentX * next - point.x; stage.scrollTop = contentY * next - point.y; });
  };

  return <article className="image-report" data-scale={scale}>
    <header>
      <div><h2>{asset.title}</h2>{asset.description && <p>{asset.description}</p>}</div>
      <div className="report-zoom-controls" aria-label="图片缩放">
        <button type="button" onClick={() => updateScale(scale - .25)} aria-label="缩小报告图片" disabled={scale === 1}>−</button>
        <output aria-live="polite">{Math.round(scale * 100)}%</output>
        <button type="button" onClick={() => updateScale(scale + .25)} aria-label="放大报告图片" disabled={scale === 3}>＋</button>
      </div>
    </header>
    {failed ? <div className="report-error" role="alert"><strong>{asset.title}</strong><p>资料加载失败</p><button type="button" onClick={() => { setFailed(false); setLoaded(false); setRetry((value) => value + 1); }}>重新加载</button></div> :
      <div ref={stageRef} className={`report-image-stage ${loaded ? "is-loaded" : "is-loading"} ${dragging ? "is-dragging" : ""}`} aria-label="报告图片查看区域，可在区域内缩放和拖动" onDoubleClick={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); updateScale(scale === 1 ? 2 : 1, { x: event.clientX - bounds.left, y: event.clientY - bounds.top }); }}
        onTouchStart={(event) => { if (event.touches.length !== 2) return; const bounds = event.currentTarget.getBoundingClientRect(); const viewportX = (event.touches[0].clientX + event.touches[1].clientX) / 2 - bounds.left; const viewportY = (event.touches[0].clientY + event.touches[1].clientY) / 2 - bounds.top; pinchStart.current = { distance: touchDistance(event), scale, contentX: (event.currentTarget.scrollLeft + viewportX) / scale, contentY: (event.currentTarget.scrollTop + viewportY) / scale, viewportX, viewportY }; }}
        onTouchMove={(event) => { if (event.touches.length !== 2 || !pinchStart.current) return; const distance = touchDistance(event); if (!distance || !pinchStart.current.distance) return; event.preventDefault(); const next = Math.min(3, Math.max(1, pinchStart.current.scale * distance / pinchStart.current.distance)); scaleRef.current = next; setScale(next); const start = pinchStart.current; const stage = event.currentTarget; requestAnimationFrame(() => { stage.scrollLeft = start.contentX * next - start.viewportX; stage.scrollTop = start.contentY * next - start.viewportY; }); }}
        onTouchEnd={(event) => { if (event.touches.length < 2) pinchStart.current = null; }}
        onPointerDown={(event) => { if (event.pointerType !== "mouse" || event.button !== 0) return; dragStart.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop }; event.currentTarget.setPointerCapture(event.pointerId); setDragging(true); }}
        onPointerMove={(event) => { if (!dragStart.current) return; event.currentTarget.scrollLeft = dragStart.current.left - (event.clientX - dragStart.current.x); event.currentTarget.scrollTop = dragStart.current.top - (event.clientY - dragStart.current.y); }}
        onPointerUp={(event) => { if (!dragStart.current) return; dragStart.current = null; event.currentTarget.releasePointerCapture(event.pointerId); setDragging(false); }}
        onPointerCancel={() => { dragStart.current = null; setDragging(false); }}>
        {!loaded && <div className="report-image-skeleton" aria-hidden="true"/>}
        <div className="report-image-scroll"><Image key={retry} unoptimized width={1200} height={1600} src={asset.href} alt={asset.title} draggable={false} style={{ width: `${scale * 100}%` }} onLoad={() => setLoaded(true)} onError={() => setFailed(true)}/></div>
      </div>}
  </article>;
}
