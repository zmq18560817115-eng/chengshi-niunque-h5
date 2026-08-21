"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function PublicContentLiveRefresh({ version }: { version: string }) {
  const router = useRouter();
  const refreshing = useRef(false);

  useEffect(() => {
    refreshing.current = false;
    const check = async () => {
      if (document.visibilityState !== "visible" || refreshing.current) return;
      try {
        const response = await fetch("/api/public/content", { cache: "no-store", headers: { Accept: "application/json" } });
        if (!response.ok) return;
        const content = await response.json() as { version?: string };
        if (content.version && content.version !== version) {
          refreshing.current = true;
          router.refresh();
        }
      } catch {
        // A temporary network interruption must not replace the last good public content.
      }
    };
    const timer = window.setInterval(check, 2500);
    document.addEventListener("visibilitychange", check);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", check); };
  }, [router, version]);

  return null;
}
