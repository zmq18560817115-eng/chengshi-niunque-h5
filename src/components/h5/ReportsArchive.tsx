"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { getArchiveModuleLayout } from "@/config/h5-archive-modules";
import type { PublicModule } from "@/server/services/public-content-service";
import { defaultH5SiteConfig, type H5SiteConfig } from "@/server/services/h5-site-config";
import { AdaptiveReadinessGate, useAdaptiveReadiness } from "@/components/h5/AdaptiveReadinessGate";
import { ArchiveArtwork, archiveArtworkWarmAssets } from "@/components/h5/ArchiveArtwork";
import { ArchiveFishFloatMotion, archiveFishWarmAssets } from "@/components/h5/motion/modules/ArchiveFishFloatMotion";
import { ArchiveSectionTitleMotion, archiveSectionTitleWarmAssets } from "@/components/h5/motion/modules/ArchiveSectionTitleMotion";
import { ArchiveStoryCopyMotion, archiveStoryWarmAssets } from "@/components/h5/motion/modules/ArchiveStoryCopyMotion";
import { archiveUnlockWarmAssets } from "@/components/h5/motion/modules/ArchiveUnlockTabMotion";
import { archiveModuleExitDelayMs, archiveModuleNavigationDelayMs, categoryRouteEntryAttribute, navigateWithCategoryContinuity, prepareCategoryRouteContinuity } from "@/components/h5/category-route-transition";
import { announceGuideRouteReady, guideRouteEntryAttribute } from "@/components/h5/guide-route-transition";
import { releaseHomepagePreloadedAssets } from "@/components/h5/homepage-preload";

const reportsReadinessRequests = [
  ...archiveArtworkWarmAssets.map((src) => ({ src, priority: "high" as const })),
  ...archiveUnlockWarmAssets.map((src) => ({ src, priority: "auto" as const })),
  ...archiveFishWarmAssets.map((src) => ({ src, priority: "auto" as const })),
  ...archiveStoryWarmAssets.map((src) => ({ src, priority: "auto" as const })),
  ...archiveSectionTitleWarmAssets.map((src) => ({ src, priority: "auto" as const })),
] as const;

type ReportsArchiveProps = { modules: PublicModule[]; preview?: boolean; config?: H5SiteConfig };

export function ReportsArchive(props: ReportsArchiveProps) {
  if (props.preview) return <ReportsArchiveReady {...props}/>;
  return <AdaptiveReadinessGate requests={reportsReadinessRequests} label="正在准备营养档案首页" reason="reports-assets">
    <ReportsArchiveReady {...props}/>
  </AdaptiveReadinessGate>;
}

function ReportsArchiveReady({ modules, preview = false, config = defaultH5SiteConfig }: ReportsArchiveProps) {
  const router = useRouter();
  const readinessReady = useAdaptiveReadiness();
  const [leaving, setLeaving] = useState(false);
  const [guideEntry, setGuideEntry] = useState(false);
  const [pressedSlug, setPressedSlug] = useState<string | null>(null);
  const visibleModules = useMemo(() => [...modules].filter((module) => getArchiveModuleLayout(module.slug)).sort((a, b) => getArchiveModuleLayout(a.slug)!.order - getArchiveModuleLayout(b.slug)!.order), [modules]);

  useEffect(() => {
    if (preview) return;
    const saved = sessionStorage.getItem("reports-scroll-y");
    if (saved) requestAnimationFrame(() => window.scrollTo(0, Number(saved)));
    const remember = () => sessionStorage.setItem("reports-scroll-y", String(window.scrollY));
    window.addEventListener("pagehide", remember);
    return () => window.removeEventListener("pagehide", remember);
  }, [preview]);

  useEffect(() => { if (!preview) visibleModules.forEach((module) => router.prefetch(`/reports/${module.slug}`)); }, [preview, router, visibleModules]);

  useEffect(() => {
    if (preview || !readinessReady) return;
    if (document.documentElement.hasAttribute(guideRouteEntryAttribute)) setGuideEntry(true);
    announceGuideRouteReady();
  }, [preview, readinessReady]);

  useEffect(() => {
    if (preview) return;
    return () => releaseHomepagePreloadedAssets();
  }, [preview]);

  const enter = (module: PublicModule) => {
    if (leaving || preview) return;
    prepareCategoryRouteContinuity();
    setPressedSlug(module.slug);
    sessionStorage.setItem("reports-scroll-y", String(window.scrollY));
    document.documentElement.setAttribute(categoryRouteEntryAttribute, module.slug);
    window.setTimeout(() => {
      setLeaving(true);
      window.setTimeout(() => navigateWithCategoryContinuity(() => router.push(`/reports/${module.slug}`)), archiveModuleNavigationDelayMs);
    }, archiveModuleExitDelayMs);
  };

  const exitingSlug = leaving ? pressedSlug : null;

  return <main className={`h5-shell reports-archive reports-archive-final reports-entry-transition h5-page-transition ${leaving ? "is-leaving" : ""}`} aria-label={config.archiveTitle} data-exit-slug={exitingSlug ?? undefined} data-guide-entry={guideEntry ? "reference-staged" : undefined}>
    <div className="reports-archive-canvas">
      {/* Runtime artwork is assembled from the approved source parts. The old
          plant decoration and module-two title layers are omitted because their
          supplied GIF replacements are rendered by ArchiveSectionTitleMotion. */}
      <ArchiveArtwork preview={preview} exitingSlug={exitingSlug} />
      <ArchiveFishFloatMotion preview={preview} />
      <ArchiveStoryCopyMotion preview={preview} />
      <ArchiveSectionTitleMotion preview={preview} exitingSlug={exitingSlug} />
      <nav className="reports-archive-hotspots" aria-label="档案分类">
        {visibleModules.map((module) => {
          const layout = getArchiveModuleLayout(module.slug)!;
          const style = { left: layout.left, top: layout.top, width: layout.width, height: layout.height, "--archive-order": layout.order } as CSSProperties;
          return preview ? <div key={module.id} className="archive-category-hotspot" data-slug={module.slug} style={style}><span>{module.title}</span></div> :
            <button key={module.id} type="button" className={`archive-category-hotspot ${pressedSlug === module.slug ? "is-pressed" : ""}`} data-slug={module.slug} style={style} aria-label={`${layout.label}，${module.cards.length}项档案`} disabled={leaving} onClick={() => enter(module)}><span>{module.title}</span></button>;
        })}
      </nav>
    </div>
  </main>;
}
