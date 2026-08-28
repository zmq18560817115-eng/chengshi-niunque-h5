"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode, type TouchEvent } from "react";

const SWIPE_BACK_DISTANCE = 72;
const SWIPE_BACK_EDGE_PX = 28;
const SWIPE_BACK_IGNORED_TARGETS = [
  "button", "a", "input", "select", "textarea", "summary",
  "[role='button']", "[role='link']", "[contenteditable='true']",
  "[data-swipe-back-ignore]", ".report-image-stage",
].join(",");

export function SwipeBackPage({
  children,
  className,
  fallbackHref,
  preview = false,
  showBackControl = true,
  ...props
}: {
  children: ReactNode;
  className: string;
  fallbackHref: string;
  preview?: boolean;
  showBackControl?: boolean;
} & Omit<React.ComponentPropsWithoutRef<"main">, "children" | "className">) {
  const router = useRouter();
  const start = useRef<{ x: number; y: number } | null>(null);
  const [leavingBack, setLeavingBack] = useState(false);

  const goBack = () => {
    if (preview || leavingBack) return;
    setLeavingBack(true);
    window.setTimeout(() => router.replace(fallbackHref), 220);
  };

  const onTouchStart = (event: TouchEvent<HTMLElement>) => {
    start.current = null;
    if (preview || leavingBack || event.touches.length !== 1) return;
    const target = event.target;
    if (target instanceof Element && target.closest(SWIPE_BACK_IGNORED_TARGETS)) return;
    const touch = event.touches[0];
    const viewportLeft = window.visualViewport?.offsetLeft ?? 0;
    const contentLeft = event.currentTarget.getBoundingClientRect().left;
    const usableEdgeLeft = Math.max(viewportLeft, contentLeft);
    if (touch.clientX < usableEdgeLeft || touch.clientX > usableEdgeLeft + SWIPE_BACK_EDGE_PX) return;
    start.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const origin = start.current;
    start.current = null;
    if (!origin || preview || leavingBack || event.changedTouches.length !== 1) return;
    const deltaX = event.changedTouches[0].clientX - origin.x;
    const deltaY = event.changedTouches[0].clientY - origin.y;
    if (deltaX < SWIPE_BACK_DISTANCE || Math.abs(deltaX) <= Math.abs(deltaY) * 1.25) return;
    goBack();
  };

  return <main {...props} className={`${className} ${leavingBack ? "is-swipe-back" : ""}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={() => { start.current = null; }}>
    {!preview && showBackControl ? <button className="swipe-back-control" type="button" onClick={goBack} disabled={leavingBack}>返回上一页</button> : null}
    {children}
  </main>;
}
