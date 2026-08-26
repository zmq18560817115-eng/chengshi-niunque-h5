"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode, type TouchEvent } from "react";

const SWIPE_BACK_DISTANCE = 72;

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
    window.setTimeout(() => router.push(fallbackHref), 220);
  };

  const onTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (preview || leavingBack || event.touches.length !== 1) return;
    start.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
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

  return <main {...props} className={`${className} ${leavingBack ? "is-swipe-back" : ""}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
    {!preview && showBackControl ? <button className="swipe-back-control" type="button" onClick={goBack} disabled={leavingBack}>返回上一页</button> : null}
    {children}
  </main>;
}
