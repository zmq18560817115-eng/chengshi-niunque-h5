"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
import Image from "next/image";
import type { PublicAsset } from "@/server/services/public-content-service";

type ScaleAnchor = { contentX: number; contentY: number; screenX: number; screenY: number };

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

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
  const pinchStart = useRef<{ distance: number; scale: number; contentX: number; contentY: number } | null>(null);
  const touchPanPoint = useRef<{ x: number; y: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const pinchFrame = useRef<number | null>(null);
  const anchorFrame = useRef<number | null>(null);
  const pendingPinch = useRef<{ next: number; stage: HTMLDivElement; anchor: ScaleAnchor } | null>(null);
  const page = pages[Math.min(pageIndex, pages.length - 1)];

  useEffect(() => () => {
    if (pinchFrame.current !== null) window.cancelAnimationFrame(pinchFrame.current);
    if (anchorFrame.current !== null) window.cancelAnimationFrame(anchorFrame.current);
  }, []);

  const touchDistance = (event: TouchEvent<HTMLDivElement>) => {
    const [first, second] = [event.touches[0], event.touches[1]];
    return first && second ? Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY) : 0;
  };

  const restoreScaleAnchor = (stage: HTMLDivElement, next: number, anchor: ScaleAnchor) => {
    if (anchorFrame.current !== null) window.cancelAnimationFrame(anchorFrame.current);
    anchorFrame.current = window.requestAnimationFrame(() => {
      anchorFrame.current = null;
      const bounds = stage.getBoundingClientRect();
      if (next === 1) {
        stage.scrollLeft = 0;
        stage.scrollTop = 0;
        const documentAnchorY = bounds.top + anchor.contentY;
        const deltaY = documentAnchorY - anchor.screenY;
        if (Math.abs(deltaY) > .5) window.scrollTo(window.scrollX, window.scrollY + deltaY);
        return;
      }

      const visualViewport = window.visualViewport;
      const viewportTop = visualViewport?.offsetTop ?? 0;
      const viewportHeight = visualViewport?.height ?? window.innerHeight;
      const viewportBottom = viewportTop + viewportHeight;
      let stageTop = bounds.top;
      if (anchor.screenY < bounds.top || anchor.screenY > bounds.bottom) {
        const maximumTop = Math.max(viewportTop, viewportBottom - stage.clientHeight);
        const desiredTop = clamp(anchor.screenY - stage.clientHeight / 2, viewportTop, maximumTop);
        window.scrollTo(window.scrollX, window.scrollY + bounds.top - desiredTop);
        stageTop = desiredTop;
      }
      const viewportX = clamp(anchor.screenX - bounds.left, 0, stage.clientWidth);
      const viewportY = clamp(anchor.screenY - stageTop, 0, stage.clientHeight);
      stage.scrollLeft = anchor.contentX * next - viewportX;
      stage.scrollTop = anchor.contentY * next - viewportY;
    });
  };

  const updateScale = (nextValue: number, focalPoint?: { x: number; y: number }) => {
    const stage = stageRef.current;
    const previous = scaleRef.current;
    const next = Math.min(4, Math.max(1, nextValue));
    if (next === previous) return;
    let anchor: ScaleAnchor | null = null;
    if (stage) {
      const bounds = stage.getBoundingClientRect();
      const visualViewport = window.visualViewport;
      const viewportLeft = visualViewport?.offsetLeft ?? 0;
      const viewportTop = visualViewport?.offsetTop ?? 0;
      const viewportRight = viewportLeft + (visualViewport?.width ?? window.innerWidth);
      const viewportBottom = viewportTop + (visualViewport?.height ?? window.innerHeight);
      const visibleLeft = Math.max(bounds.left, viewportLeft);
      const visibleRight = Math.min(bounds.right, viewportRight);
      const visibleTop = Math.max(bounds.top, viewportTop);
      const visibleBottom = Math.min(bounds.bottom, viewportBottom);
      const point = focalPoint ?? {
        x: (visibleRight > visibleLeft ? (visibleLeft + visibleRight) / 2 : bounds.left + stage.clientWidth / 2) - bounds.left,
        y: (visibleBottom > visibleTop ? (visibleTop + visibleBottom) / 2 : bounds.top + stage.clientHeight / 2) - bounds.top,
      };
      anchor = {
        contentX: (stage.scrollLeft + point.x) / previous,
        contentY: (stage.scrollTop + point.y) / previous,
        screenX: bounds.left + point.x,
        screenY: bounds.top + point.y,
      };
    }
    scaleRef.current = next;
    setScale(next);
    if (stage && anchor) restoreScaleAnchor(stage, next, anchor);
  };

  const resetView = () => {
    if (anchorFrame.current !== null) {
      window.cancelAnimationFrame(anchorFrame.current);
      anchorFrame.current = null;
    }
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
        <button type="button" onClick={() => updateScale(1)} aria-label="恢复报告图片原始大小" disabled={scale === 1}>还原</button>
      </div>
    </header>
    {pages.length > 1 && <nav className="report-page-controls" aria-label={`${asset.title}图片页`}><button type="button" onClick={() => selectPage(pageIndex - 1)} disabled={pageIndex === 0}>上一页</button><span>{pageIndex + 1} / {pages.length}</span><button type="button" onClick={() => selectPage(pageIndex + 1)} disabled={pageIndex === pages.length - 1}>下一页</button></nav>}
    {failed ? <div className="report-error" role="alert"><strong>{asset.title} · 第 {pageIndex + 1} 页</strong><p>资料加载失败</p><button type="button" onClick={() => { setFailed(false); setLoaded(false); setRetry((value) => value + 1); }}>重新加载</button></div> :
      <div ref={stageRef} className={`report-image-stage ${loaded ? "is-loaded" : "is-loading"} ${scale > 1 ? "is-zoomed" : ""} ${dragging ? "is-dragging" : ""} ${pinching ? "is-pinching" : ""}`} data-swipe-back-ignore={scale > 1 || undefined} aria-label="报告图片查看区域，原始大小随页面滚动，放大后可在区域内缩放和拖动" onDoubleClick={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); updateScale(scale === 1 ? 2 : 1, { x: event.clientX - bounds.left, y: event.clientY - bounds.top }); }}
        onTouchStart={(event) => {
          if (event.touches.length === 2) {
            const bounds = event.currentTarget.getBoundingClientRect();
            const viewportX = (event.touches[0].clientX + event.touches[1].clientX) / 2 - bounds.left;
            const viewportY = (event.touches[0].clientY + event.touches[1].clientY) / 2 - bounds.top;
            const currentScale = scaleRef.current;
            pinchStart.current = { distance: touchDistance(event), scale: currentScale, contentX: (event.currentTarget.scrollLeft + viewportX) / currentScale, contentY: (event.currentTarget.scrollTop + viewportY) / currentScale };
            touchPanPoint.current = null;
            setPinching(true);
          } else if (event.touches.length === 1 && scaleRef.current > 1) {
            touchPanPoint.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
          }
        }}
        onTouchMove={(event) => {
          if (event.touches.length === 2 && pinchStart.current) {
            const distance = touchDistance(event);
            if (!distance || !pinchStart.current.distance) return;
            const next = Math.min(4, Math.max(1, pinchStart.current.scale * distance / pinchStart.current.distance));
            const start = pinchStart.current;
            pendingPinch.current = { next, stage: event.currentTarget, anchor: {
              contentX: start.contentX,
              contentY: start.contentY,
              screenX: (event.touches[0].clientX + event.touches[1].clientX) / 2,
              screenY: (event.touches[0].clientY + event.touches[1].clientY) / 2,
            } };
            if (pinchFrame.current === null) {
              pinchFrame.current = window.requestAnimationFrame(() => {
                pinchFrame.current = null;
                const pending = pendingPinch.current;
                pendingPinch.current = null;
                if (!pending) return;
                scaleRef.current = pending.next;
                setScale(pending.next);
                restoreScaleAnchor(pending.stage, pending.next, pending.anchor);
              });
            }
          } else if (event.touches.length === 1 && touchPanPoint.current && scaleRef.current > 1) {
            const current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
            const scrollDeltaX = touchPanPoint.current.x - current.x;
            const scrollDeltaY = touchPanPoint.current.y - current.y;
            touchPanPoint.current = current;
            const previousScrollTop = event.currentTarget.scrollTop;
            event.currentTarget.scrollLeft += scrollDeltaX;
            event.currentTarget.scrollTop += scrollDeltaY;
            const remainingPageDelta = scrollDeltaY - (event.currentTarget.scrollTop - previousScrollTop);
            if (Math.abs(remainingPageDelta) > .5) window.scrollTo(window.scrollX, window.scrollY + remainingPageDelta);
          }
        }}
        onTouchEnd={(event) => { if (event.touches.length < 2) { pinchStart.current = null; setPinching(false); } touchPanPoint.current = event.touches.length === 1 && scaleRef.current > 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null; }}
        onTouchCancel={() => { pinchStart.current = null; touchPanPoint.current = null; setPinching(false); }}
        onPointerDown={(event) => { if (event.pointerType !== "mouse" || event.button !== 0) return; dragStart.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop }; event.currentTarget.setPointerCapture(event.pointerId); setDragging(true); }}
        onPointerMove={(event) => { if (!dragStart.current) return; event.currentTarget.scrollLeft = dragStart.current.left - (event.clientX - dragStart.current.x); event.currentTarget.scrollTop = dragStart.current.top - (event.clientY - dragStart.current.y); }}
        onPointerUp={(event) => { if (!dragStart.current) return; dragStart.current = null; event.currentTarget.releasePointerCapture(event.pointerId); setDragging(false); }}
        onPointerCancel={() => { dragStart.current = null; setDragging(false); }}>
        {!loaded && <div className="report-image-skeleton" aria-hidden="true"/>}
        <div className="report-image-scroll"><Image key={`${page.id}-${retry}`} unoptimized width={1200} height={1600} src={page.href} alt={`${asset.title} 第 ${pageIndex + 1} 页`} draggable={false} style={{ width: `${scale * 100}%` }} onLoad={() => setLoaded(true)} onError={() => setFailed(true)}/></div>
      </div>}
  </article>;
}
