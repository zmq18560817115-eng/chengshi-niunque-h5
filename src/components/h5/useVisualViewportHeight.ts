"use client";

import { useEffect } from "react";

let viewportUsers = 0;
let viewportFrame: number | null = null;

export function requestVisualViewportHeightSync() {
  if (viewportFrame !== null) window.cancelAnimationFrame(viewportFrame);
  viewportFrame = window.requestAnimationFrame(() => {
    viewportFrame = null;
    const root = document.documentElement;
    if (root.hasAttribute("data-guide-route-entry")) return;
    const height = window.visualViewport?.height ?? window.innerHeight;
    if (height <= 0) return;
    const nextValue = `${Math.ceil(height)}px`;
    if (root.style.getPropertyValue("--h5-visible-viewport-height") !== nextValue) {
      root.style.setProperty("--h5-visible-viewport-height", nextValue);
    }
  });
}

function addViewportListeners() {
  window.visualViewport?.addEventListener("resize", requestVisualViewportHeightSync, { passive: true });
  window.addEventListener("resize", requestVisualViewportHeightSync, { passive: true });
  window.addEventListener("orientationchange", requestVisualViewportHeightSync, { passive: true });
}

function removeViewportListeners() {
  window.visualViewport?.removeEventListener("resize", requestVisualViewportHeightSync);
  window.removeEventListener("resize", requestVisualViewportHeightSync);
  window.removeEventListener("orientationchange", requestVisualViewportHeightSync);
}

export function useVisualViewportHeight() {
  useEffect(() => {
    viewportUsers += 1;
    if (viewportUsers === 1) addViewportListeners();
    requestVisualViewportHeightSync();
    return () => {
      viewportUsers -= 1;
      if (viewportUsers <= 0) {
        viewportUsers = 0;
        removeViewportListeners();
        if (viewportFrame !== null) window.cancelAnimationFrame(viewportFrame);
        viewportFrame = null;
        document.documentElement.style.removeProperty("--h5-visible-viewport-height");
      }
    };
  }, []);
}
