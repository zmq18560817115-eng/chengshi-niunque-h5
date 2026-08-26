"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { archiveClickCueLayout, archiveInspectionMascotLayout, getArchiveModuleLayout } from "@/config/h5-archive-modules";
import { categoryRouteWarmAssets } from "@/config/h5-category-themes";
import type { PublicModule } from "@/server/services/public-content-service";
import { defaultH5SiteConfig, type H5SiteConfig } from "@/server/services/h5-site-config";
import { AdaptiveReadinessGate, useAdaptiveReadiness } from "@/components/h5/AdaptiveReadinessGate";
import { ArchiveArtwork, archiveArtworkCriticalAssets, archiveArtworkDeferredAssets } from "@/components/h5/ArchiveArtwork";
import { ArchiveFishFloatMotion, archiveFishWarmAssets } from "@/components/h5/motion/modules/ArchiveFishFloatMotion";
import { ArchiveSectionTitleMotion, archiveSectionTitleWarmAssets } from "@/components/h5/motion/modules/ArchiveSectionTitleMotion";
import { ArchiveStoryCopyMotion, archiveStoryWarmAssets } from "@/components/h5/motion/modules/ArchiveStoryCopyMotion";
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
const reportsDeferredWarmRequests = [
  ...archiveArtworkDeferredAssets.map((src) => ({ src, priority: "low" as const })),
  ...archiveFishWarmAssets.map((src) => ({ src, priority: "low" as const })),
  ...archiveStoryWarmAssets.map((src) => ({ src, priority: "low" as const })),
  ...archiveSectionTitleWarmAssets.map((src) => ({ src, priority: "low" as const })),
] as const;
const categoryRouteWarmRequests = categoryRouteWarmAssets.map((src) => ({ src, priority: "auto" as const }));

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

  useEffect(() => { if (!preview) visibleModules.forEach((module) => router.prefetch(`/reports/${module.slug}`)); }, [preview, router, visibleModules]);

  useLayoutEffect(() => {
    if (preview || !readinessReady) return;
    const entersFromGuide = document.documentElement.hasAttribute(guideRouteEntryAttribute);
    if (entersFromGuide) setGuideEntry(true);
    announceGuideRouteReady();
    if (!entersFromGuide) return;
    const timer = window.setTimeout(() => setGuideEntry(false), guideRouteStageDurationMs);
    return () => window.clearTimeout(timer);
  }, [preview, readinessReady]);

  useEffect(() => {
    if (preview || !readinessReady) return;
    void preloadHomepageAssets([...categoryRouteWarmRequests, ...reportsDeferredWarmRequests]).then((result) => {
      if (result.failed.length > 0) console.error(`[ReportsArchive] deferred assets failed: ${result.failed.join(", ")}`);
    });
  }, [preview, readinessReady]);

  useEffect(() => {
    if (preview) return;
    const releaseOnPageExit = () => releaseHomepagePreloadedAssets();
    window.addEventListener("pagehide", releaseOnPageExit);
    return () => window.removeEventListener("pagehide", releaseOnPageExit);
  }, [preview]);

  const enter = (module: PublicModule) => {
    if (navigating.current || leaving || preview) return;
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

  const exitingSlug = leaving ? pressedSlug : null;

  const guideEntryStyle = {
    "--archive-guide-book-duration": `${guideArchiveEntryTiming.bookDurationMs}ms`,
    "--archive-guide-book-delay": `${guideArchiveEntryTiming.bookDelayMs}ms`,
    "--archive-guide-batch-duration": `${guideArchiveEntryTiming.batchDurationMs}ms`,
    "--archive-guide-batch-delay": `${guideArchiveBatchDelayMs}ms`,
  } as CSSProperties;

  return <main className={`h5-shell reports-archive reports-archive-final reports-entry-transition h5-page-transition ${leaving ? "is-leaving" : ""}`} aria-label={config.archiveTitle} data-exit-slug={exitingSlug ?? undefined} data-guide-entry={guideEntry ? "reference-staged" : undefined} data-preview={preview || undefined} style={guideEntryStyle}>
    <div className="reports-archive-canvas">
      {/* Runtime artwork is assembled from the approved source parts. The old
          plant decoration and module-two title layers are omitted because their
          supplied GIF replacements are rendered by ArchiveSectionTitleMotion. */}
      <ArchiveArtwork preview={preview} activeSlug={pressedSlug} exitingSlug={exitingSlug} />
      <ArchiveFishFloatMotion preview={preview} />
      <ArchiveStoryCopyMotion preview={preview} />
      <ArchiveSectionTitleMotion preview={preview} activeSlug={pressedSlug} exitingSlug={exitingSlug} />
      <nav className="reports-archive-hotspots" aria-label="档案分类">
        {inspectionModule && (preview ?
          <div className="archive-click-cue-hotspot" data-cue-slug="inspection-projects" style={archiveClickCueLayout}><span>点击进入检测项目</span></div> :
          <button type="button" className={`archive-click-cue-hotspot ${pressedSlug === "inspection-projects" ? "is-pressed" : ""}`} data-cue-slug="inspection-projects" style={archiveClickCueLayout} aria-label="点击进入检测项目" disabled={leaving} onPointerDown={() => setPressedSlug("inspection-projects")} onPointerCancel={() => { if (!navigating.current) setPressedSlug(null); }} onClick={() => enter(inspectionModule)}><span>点击进入检测项目</span></button>
        )}
        {inspectionModule && (preview ?
          <div className="archive-click-cue-hotspot archive-inspection-mascot-hotspot" data-mascot-slug="inspection-projects" style={archiveInspectionMascotLayout}><span>检测项目人物</span></div> :
          <button type="button" className={`archive-click-cue-hotspot archive-inspection-mascot-hotspot ${pressedSlug === "inspection-projects" ? "is-pressed" : ""}`} data-mascot-slug="inspection-projects" style={archiveInspectionMascotLayout} aria-label="检测项目人物，点击进入检测项目" disabled={leaving} onPointerDown={() => setPressedSlug("inspection-projects")} onPointerCancel={() => { if (!navigating.current) setPressedSlug(null); }} onClick={() => enter(inspectionModule)}><span>检测项目人物</span></button>
        )}
        {visibleModules.map((module) => {
          const layout = getArchiveModuleLayout(module.slug)!;
          const style = { left: layout.left, top: layout.top, width: layout.width, height: layout.height, "--archive-order": layout.order } as CSSProperties;
          return preview ? <div key={module.id} className="archive-category-hotspot" data-slug={module.slug} style={style}><span>{module.title}</span></div> :
            <button key={module.id} type="button" className={`archive-category-hotspot ${pressedSlug === module.slug ? "is-pressed" : ""}`} data-slug={module.slug} style={style} aria-label={`${layout.label}，${module.cards.length}项档案`} disabled={leaving} onPointerDown={() => setPressedSlug(module.slug)} onPointerCancel={() => { if (!navigating.current) setPressedSlug(null); }} onClick={() => enter(module)}><span>{module.title}</span></button>;
        })}
      </nav>
    </div>
  </main>;
}
