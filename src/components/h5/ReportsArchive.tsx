"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { archiveClickCueLayout, archiveInspectionMascotLayout, getArchiveModuleLayout } from "@/config/h5-archive-modules";
import { getCategoryReadinessAssets } from "@/config/h5-category-themes";
import type { PublicModule } from "@/server/services/public-content-service";
import { defaultH5SiteConfig, type H5SiteConfig } from "@/server/services/h5-site-config";
import { AdaptiveReadinessGate, useAdaptiveReadiness } from "@/components/h5/AdaptiveReadinessGate";
import { ArchiveArtwork, archiveArtworkCriticalAssets } from "@/components/h5/ArchiveArtwork";
import { ArchiveFishFloatMotion } from "@/components/h5/motion/modules/ArchiveFishFloatMotion";
import { ArchiveSectionTitleMotion } from "@/components/h5/motion/modules/ArchiveSectionTitleMotion";
import { ArchiveStoryCopyMotion } from "@/components/h5/motion/modules/ArchiveStoryCopyMotion";
import { archiveUnlockWarmAssets } from "@/components/h5/motion/modules/ArchiveUnlockTabMotion";
import { archiveModuleExitDelayMs, archiveModuleNavigationDelayMs, categoryRouteEntryAttribute, navigateWithCategoryContinuity, prepareCategoryRouteContinuity } from "@/components/h5/category-route-transition";
import {
  announceGuideRouteReady,
  guideArchiveBatchDelayMs,
  guideArchiveEntryTiming,
  guideRouteEntryAttribute,
  guideRouteStageDurationMs,
} from "@/components/h5/guide-route-transition";
import { preloadHomepageAssets, releaseHomepagePreloadedAssets } from "@/components/h5/homepage-preload";

const reportsReadinessRequests = [
  ...archiveArtworkCriticalAssets.map((src) => ({ src, priority: "high" as const })),
  ...archiveUnlockWarmAssets.map((src) => ({ src, priority: "high" as const })),
] as const;
type ReportsArchiveProps = { modules: PublicModule[]; preview?: boolean; config?: H5SiteConfig };

export function ReportsArchive(props: ReportsArchiveProps) {
  if (props.preview) return <ReportsArchiveReady {...props}/>;
  return <AdaptiveReadinessGate requests={reportsReadinessRequests} label="正在准备营养档案首页" reason="reports-assets" revealDelayMs={160} settleSelector=".reports-archive-final" settleFrames={3}>
    <ReportsArchiveReady {...props}/>
  </AdaptiveReadinessGate>;
}

function ReportsArchiveReady({ modules, preview = false, config = defaultH5SiteConfig }: ReportsArchiveProps) {
  const router = useRouter();
  const readinessReady = useAdaptiveReadiness();
  const [leaving, setLeaving] = useState(false);
  const [guideEntry, setGuideEntry] = useState(false);
  const [deferredMounted, setDeferredMounted] = useState(preview);
  const [deepDeferredMounted, setDeepDeferredMounted] = useState(preview);
  const [pressedSlug, setPressedSlug] = useState<string | null>(null);
  const navigating = useRef(false);
  const visibleModules = useMemo(() => [...modules].filter((module) => getArchiveModuleLayout(module.slug)).sort((a, b) => getArchiveModuleLayout(a.slug)!.order - getArchiveModuleLayout(b.slug)!.order), [modules]);
  const inspectionModule = visibleModules.find((module) => module.slug === "inspection-projects");

  useEffect(() => {
    if (preview) return;
    const entersFromGuide = document.documentElement.hasAttribute(guideRouteEntryAttribute);
    const saved = entersFromGuide ? null : sessionStorage.getItem("reports-scroll-y");
    if (entersFromGuide) {
      sessionStorage.removeItem("reports-scroll-y");
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo(0, 0);
      requestAnimationFrame(() => {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo(0, 0);
      });
    } else if (saved) {
      requestAnimationFrame(() => window.scrollTo(0, Number(saved)));
    }
    const remember = () => sessionStorage.setItem("reports-scroll-y", String(window.scrollY));
    window.addEventListener("pagehide", remember);
    return () => window.removeEventListener("pagehide", remember);
  }, [preview]);

  useEffect(() => {
    if (preview) return;
    const prefetchCategoryRoutes = () => visibleModules.forEach((module) => router.prefetch(`/reports/${module.slug}`));
    const idleWindow = window as typeof window & { requestIdleCallback?: Window["requestIdleCallback"]; cancelIdleCallback?: Window["cancelIdleCallback"] };
    if (typeof idleWindow.requestIdleCallback === "function") {
      const idleId = idleWindow.requestIdleCallback(prefetchCategoryRoutes, { timeout: 1500 });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }
    const timer = globalThis.setTimeout(prefetchCategoryRoutes, 250);
    return () => globalThis.clearTimeout(timer);
  }, [preview, router, visibleModules]);

  useLayoutEffect(() => {
    if (preview || !readinessReady) return;
    const entersFromGuide = document.documentElement.hasAttribute(guideRouteEntryAttribute);
    if (!entersFromGuide) {
      setDeferredMounted(true);
      setDeepDeferredMounted(true);
      announceGuideRouteReady();
      return;
    }
    setGuideEntry(true);
    let revealFrame = 0;
    let paintedFrame = 0;
    let stageTimer = 0;
    let deferredTimer = 0;
    let idleId: number | undefined;
    const idleWindow = window as typeof window & { requestIdleCallback?: Window["requestIdleCallback"]; cancelIdleCallback?: Window["cancelIdleCallback"] };
    revealFrame = window.requestAnimationFrame(() => {
      paintedFrame = window.requestAnimationFrame(() => {
        // The mounted critical images are decoded and painted at this point.
        // Release duplicate preload references before the two composited groups
        // begin moving so mobile WebViews do not hit a texture-memory spike.
        releaseHomepagePreloadedAssets();
        announceGuideRouteReady();
        stageTimer = window.setTimeout(() => {
          setGuideEntry(false);
          setDeferredMounted(true);
          deferredTimer = window.setTimeout(() => {
            if (typeof idleWindow.requestIdleCallback === "function") {
              idleId = idleWindow.requestIdleCallback(() => setDeepDeferredMounted(true), { timeout: 1200 });
            } else {
              setDeepDeferredMounted(true);
            }
          }, 320);
        }, guideRouteStageDurationMs + 32);
      });
    });
    return () => {
      window.cancelAnimationFrame(revealFrame);
      window.cancelAnimationFrame(paintedFrame);
      window.clearTimeout(stageTimer);
      window.clearTimeout(deferredTimer);
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
    };
  }, [preview, readinessReady]);

  useEffect(() => {
    if (preview) return;
    const releaseOnPageExit = () => releaseHomepagePreloadedAssets();
    window.addEventListener("pagehide", releaseOnPageExit);
    return () => window.removeEventListener("pagehide", releaseOnPageExit);
  }, [preview]);

  useEffect(() => {
    if (preview || !readinessReady || guideEntry) return;
    // The mounted Next images now own the decoded artwork. Drop the temporary
    // preload element references so mobile browsers may reclaim duplicate
    // decoded surfaces before the user opens a category.
    const timer = window.setTimeout(() => {
      if (!navigating.current) releaseHomepagePreloadedAssets();
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [guideEntry, preview, readinessReady]);

  const enter = (module: PublicModule) => {
    if (navigating.current || leaving || guideEntry || preview || document.documentElement.hasAttribute(guideRouteEntryAttribute)) return;
    navigating.current = true;
    setPressedSlug(module.slug);
    sessionStorage.setItem("reports-scroll-y", String(window.scrollY));
    document.documentElement.setAttribute(categoryRouteEntryAttribute, module.slug);
    window.setTimeout(() => {
      prepareCategoryRouteContinuity();
      setLeaving(true);
      window.setTimeout(() => navigateWithCategoryContinuity(() => router.push(`/reports/${module.slug}`)), archiveModuleNavigationDelayMs);
    }, archiveModuleExitDelayMs);
  };

  const pressModule = (slug: string) => {
    if (navigating.current || leaving || guideEntry || preview) return;
    setPressedSlug(slug);
    const requests = getCategoryReadinessAssets(slug).map((src) => ({ src, priority: "high" as const }));
    void preloadHomepageAssets(requests).catch(() => undefined);
  };

  const exitingSlug = leaving ? pressedSlug : null;

  const guideEntryStyle = {
    "--archive-guide-book-duration": `${guideArchiveEntryTiming.bookDurationMs}ms`,
    "--archive-guide-book-delay": `${guideArchiveEntryTiming.bookDelayMs}ms`,
    "--archive-guide-batch-duration": `${guideArchiveEntryTiming.batchDurationMs}ms`,
    "--archive-guide-batch-delay": `${guideArchiveBatchDelayMs}ms`,
  } as CSSProperties;

  return <main className={`h5-shell reports-archive reports-archive-final reports-entry-transition h5-page-transition ${leaving ? "is-leaving" : ""}`} aria-label={config.archiveTitle} aria-busy={guideEntry || leaving || undefined} data-exit-slug={exitingSlug ?? undefined} data-pressed-slug={pressedSlug ?? undefined} data-guide-entry={guideEntry ? "reference-staged" : undefined} data-deferred-artwork={deferredMounted ? "mounted" : "waiting"} data-preview={preview || undefined} style={guideEntryStyle}>
    <div className="reports-archive-canvas">
      {/* Runtime artwork is assembled from the approved source parts. The old
          plant decoration and module-two title layers are omitted because their
          supplied GIF replacements are rendered by ArchiveSectionTitleMotion. */}
      <ArchiveArtwork preview={preview} activeSlug={pressedSlug} exitingSlug={exitingSlug} mountDeferred={preview || deferredMounted} mountDeepDeferred={preview || deepDeferredMounted} />
      {(preview || deferredMounted) && <ArchiveFishFloatMotion preview={preview} />}
      {(preview || deferredMounted) && <ArchiveStoryCopyMotion preview={preview} />}
      {(preview || deferredMounted) && <ArchiveSectionTitleMotion preview={preview} activeSlug={pressedSlug} exitingSlug={exitingSlug} />}
      <nav className="reports-archive-hotspots" aria-label="档案分类">
        {inspectionModule && (preview ?
          <div className="archive-click-cue-hotspot" data-cue-slug="inspection-projects" style={archiveClickCueLayout}><span>点击进入检测项目</span></div> :
          <button type="button" className={`archive-click-cue-hotspot ${pressedSlug === "inspection-projects" ? "is-pressed" : ""}`} data-cue-slug="inspection-projects" style={archiveClickCueLayout} aria-label="点击进入检测项目" disabled={leaving || guideEntry} onPointerDown={() => pressModule("inspection-projects")} onPointerCancel={() => { if (!navigating.current) setPressedSlug(null); }} onClick={() => enter(inspectionModule)}><span>点击进入检测项目</span></button>
        )}
        {inspectionModule && (preview ?
          <div className="archive-click-cue-hotspot archive-inspection-mascot-hotspot" data-mascot-slug="inspection-projects" style={archiveInspectionMascotLayout}><span>检测项目人物</span></div> :
          <button type="button" className={`archive-click-cue-hotspot archive-inspection-mascot-hotspot ${pressedSlug === "inspection-projects" ? "is-pressed" : ""}`} data-mascot-slug="inspection-projects" style={archiveInspectionMascotLayout} aria-label="检测项目人物，点击进入检测项目" disabled={leaving || guideEntry} onPointerDown={() => pressModule("inspection-projects")} onPointerCancel={() => { if (!navigating.current) setPressedSlug(null); }} onClick={() => enter(inspectionModule)}><span>检测项目人物</span></button>
        )}
        {visibleModules.map((module) => {
          const layout = getArchiveModuleLayout(module.slug)!;
          const style = { left: layout.left, top: layout.top, width: layout.width, height: layout.height, "--archive-order": layout.order } as CSSProperties;
          return preview ? <div key={module.id} className="archive-category-hotspot" data-slug={module.slug} style={style}><span>{module.title}</span></div> :
            <button key={module.id} type="button" className={`archive-category-hotspot ${pressedSlug === module.slug ? "is-pressed" : ""}`} data-slug={module.slug} style={style} aria-label={`${layout.label}，${module.cards.length}项档案`} disabled={leaving || guideEntry} onPointerDown={() => pressModule(module.slug)} onPointerCancel={() => { if (!navigating.current) setPressedSlug(null); }} onClick={() => enter(module)}><span>{module.title}</span></button>;
        })}
      </nav>
    </div>
  </main>;
}
