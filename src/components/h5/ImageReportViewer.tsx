"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
import Image from "next/image";
import type { PublicAsset } from "@/server/services/public-content-service";

export function ImageReportViewer({ asset }: { asset: PublicAsset }) {
  const pages = asset.pages.length > 0 ? asset.pages : [{ id: asset.id, pageNumber: 1, href: asset.href }];
  const [pageIndex, setPageIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [pinching, setPinching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [retry, setRetry] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const pinchStart = useRef<{ distance: number; scale: number; contentX: number; contentY: number; viewportX: number; viewportY: number } | null>(null);
  const touchPanStart = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const pinchFrame = useRef<number | null>(null);
  const pendingPinch = useRef<{ next: number; stage: HTMLDivElement; contentX: number; contentY: number; viewportX: number; viewportY: number } | null>(null);
  const page = pages[Math.min(pageIndex, pages.length - 1)];

  useEffect(() => () => {
    if (pinchFrame.current !== null) window.cancelAnimationFrame(pinchFrame.current);
  }, []);

  const touchDistance = (event: TouchEvent<HTMLDivElement>) => {
    const [first, second] = [event.touches[0], event.touches[1]];
    return first && second ? Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY) : 0;
  };

  const updateScale = (nextValue: number, focalPoint?: { x: number; y: number }) => {
    const stage = stageRef.current;
    const previous = scaleRef.current;
    const next = Math.min(4, Math.max(1, nextValue));
    if (next === previous) return;
    const point = focalPoint ?? { x: (stage?.clientWidth ?? 0) / 2, y: (stage?.clientHeight ?? 0) / 2 };
    const contentX = ((stage?.scrollLeft ?? 0) + point.x) / previous;
    const contentY = ((stage?.scrollTop ?? 0) + point.y) / previous;
    scaleRef.current = next;
    setScale(next);
    if (stage) requestAnimationFrame(() => { stage.scrollLeft = contentX * next - point.x; stage.scrollTop = contentY * next - point.y; });
  };

  const resetView = () => {
    scaleRef.current = 1;
    setScale(1);
    if (stageRef.current) { stageRef.current.scrollLeft = 0; stageRef.current.scrollTop = 0; }
  };

  const selectPage = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= pages.length || nextIndex === pageIndex) return;
    setPageIndex(nextIndex);
    setFailed(false);
    setLoaded(false);
    setRetry(0);
    resetView();
  };

  return <article className="image-report" data-scale={scale} data-page={pageIndex + 1}>
    <header>
      <div><h2>{asset.title}</h2>{asset.description && <p>{asset.description}</p>}<small className="report-page-count">第 {pageIndex + 1} / {pages.length} 页</small></div>
      <div className="report-zoom-controls" aria-label="图片缩放">
        <button type="button" onClick={() => updateScale(scale - .25)} aria-label="缩小报告图片" disabled={scale === 1}>−</button>
        <output aria-live="polite">{Math.round(scale * 100)}%</output>
        <button type="button" onClick={() => updateScale(scale + .25)} aria-label="放大报告图片" disabled={scale === 4}>＋</button>
        <button type="button" onClick={resetView} aria-label="恢复报告图片原始大小" disabled={scale === 1}>还原</button>
      </div>
    </header>
    {pages.length > 1 && <nav className="report-page-controls" aria-label={`${asset.title}图片页`}><button type="button" onClick={() => selectPage(pageIndex - 1)} disabled={pageIndex === 0}>上一页</button><span>{pageIndex + 1} / {pages.length}</span><button type="button" onClick={() => selectPage(pageIndex + 1)} disabled={pageIndex === pages.length - 1}>下一页</button></nav>}
    {failed ? <div className="report-error" role="alert"><strong>{asset.title} · 第 {pageIndex + 1} 页</strong><p>资料加载失败</p><button type="button" onClick={() => { setFailed(false); setLoaded(false); setRetry((value) => value + 1); }}>重新加载</button></div> :
      <div ref={stageRef} className={`report-image-stage ${loaded ? "is-loaded" : "is-loading"} ${dragging ? "is-dragging" : ""} ${pinching ? "is-pinching" : ""}`} aria-label="报告图片固定查看区域，可在区域内反复缩放和拖动，不会放大整个页面" onDoubleClick={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); updateScale(scale === 1 ? 2 : 1, { x: event.clientX - bounds.left, y: event.clientY - bounds.top }); }}
        onTouchStart={(event) => {
          if (event.touches.length === 2) {
            const bounds = event.currentTarget.getBoundingClientRect();
            const viewportX = (event.touches[0].clientX + event.touches[1].clientX) / 2 - bounds.left;
            const viewportY = (event.touches[0].clientY + event.touches[1].clientY) / 2 - bounds.top;
            pinchStart.current = { distance: touchDistance(event), scale, contentX: (event.currentTarget.scrollLeft + viewportX) / scale, contentY: (event.currentTarget.scrollTop + viewportY) / scale, viewportX, viewportY };
            touchPanStart.current = null;
            setPinching(true);
          } else if (event.touches.length === 1 && scale > 1) {
            touchPanStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop };
          }
        }}
        onTouchMove={(event) => {
          if (event.touches.length === 2 && pinchStart.current) {
            const distance = touchDistance(event);
            if (!distance || !pinchStart.current.distance) return;
            event.preventDefault();
            const next = Math.min(4, Math.max(1, pinchStart.current.scale * distance / pinchStart.current.distance));
            const start = pinchStart.current;
            pendingPinch.current = { next, stage: event.currentTarget, contentX: start.contentX, contentY: start.contentY, viewportX: start.viewportX, viewportY: start.viewportY };
            if (pinchFrame.current === null) {
              pinchFrame.current = window.requestAnimationFrame(() => {
                pinchFrame.current = null;
                const pending = pendingPinch.current;
                pendingPinch.current = null;
                if (!pending) return;
                scaleRef.current = pending.next;
                setScale(pending.next);
                window.requestAnimationFrame(() => {
                  pending.stage.scrollLeft = pending.contentX * pending.next - pending.viewportX;
                  pending.stage.scrollTop = pending.contentY * pending.next - pending.viewportY;
                });
              });
            }
          } else if (event.touches.length === 1 && touchPanStart.current && scale > 1) {
            event.preventDefault();
            event.currentTarget.scrollLeft = touchPanStart.current.left - (event.touches[0].clientX - touchPanStart.current.x);
            event.currentTarget.scrollTop = touchPanStart.current.top - (event.touches[0].clientY - touchPanStart.current.y);
          }
        }}
        onTouchEnd={(event) => { if (event.touches.length < 2) { pinchStart.current = null; setPinching(false); } if (event.touches.length === 0) touchPanStart.current = null; }}
        onPointerDown={(event) => { if (event.pointerType !== "mouse" || event.button !== 0) return; dragStart.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop }; event.currentTarget.setPointerCapture(event.pointerId); setDragging(true); }}
        onPointerMove={(event) => { if (!dragStart.current) return; event.currentTarget.scrollLeft = dragStart.current.left - (event.clientX - dragStart.current.x); event.currentTarget.scrollTop = dragStart.current.top - (event.clientY - dragStart.current.y); }}
        onPointerUp={(event) => { if (!dragStart.current) return; dragStart.current = null; event.currentTarget.releasePointerCapture(event.pointerId); setDragging(false); }}
        onPointerCancel={() => { dragStart.current = null; setDragging(false); }}>
        {!loaded && <div className="report-image-skeleton" aria-hidden="true"/>}
        <div className="report-image-scroll"><Image key={`${page.id}-${retry}`} unoptimized width={1200} height={1600} src={page.href} alt={`${asset.title} 第 ${pageIndex + 1} 页`} draggable={false} style={{ width: `${scale * 100}%` }} onLoad={() => setLoaded(true)} onError={() => setFailed(true)}/></div>
      </div>}
  </article>;
}
