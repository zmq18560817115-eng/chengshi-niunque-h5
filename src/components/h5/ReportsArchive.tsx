"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { getArchiveModuleLayout } from "@/config/h5-archive-modules";
import type { PublicModule } from "@/server/services/public-content-service";
import { defaultH5SiteConfig, type H5SiteConfig } from "@/server/services/h5-site-config";
import Image from "next/image";

export function ReportsArchive({ modules, preview = false, config = defaultH5SiteConfig }: { modules: PublicModule[]; preview?: boolean; config?: H5SiteConfig }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
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

  const enter = (module: PublicModule) => {
    if (leaving || preview) return;
    setPressedSlug(module.slug);
    sessionStorage.setItem("reports-scroll-y", String(window.scrollY));
    window.setTimeout(() => {
      setLeaving(true);
      window.setTimeout(() => router.push(`/reports/${module.slug}`), 220);
    }, 70);
  };

  return <main className={`h5-shell reports-archive reports-archive-final reports-entry-transition h5-page-transition ${leaving ? "is-leaving" : ""}`} aria-label={config.archiveTitle}>
    {/* The approved artwork is a complete 1000 x 5557 composition. Keeping it
        as one layer after the guide avoids mobile WebView alpha-compositing
        glitches caused by independently animated full-page canvases. */}
    <Image className="reports-archive-art reports-archive-clean-base" src="/design/final-v1/archive-reference.webp" alt="诚实透明档案" width={1000} height={5557} priority sizes="(max-width: 750px) 100vw, 750px" unoptimized />
    <nav className="reports-archive-hotspots" aria-label="档案分类">
      {visibleModules.map((module) => {
        const layout = getArchiveModuleLayout(module.slug)!;
        const style = { left: layout.left, top: layout.top, width: layout.width, height: layout.height, "--archive-order": layout.order } as CSSProperties;
        return preview ? <div key={module.id} className="archive-category-hotspot" data-slug={module.slug} style={style}><span>{module.title}</span></div> :
          <button key={module.id} type="button" className={`archive-category-hotspot ${pressedSlug === module.slug ? "is-pressed" : ""}`} data-slug={module.slug} style={style} aria-label={`${layout.label}，${module.cards.length}项档案`} disabled={leaving}
            onPointerDown={() => { if (!leaving) setPressedSlug(module.slug); }}
            onPointerLeave={() => setPressedSlug((current) => (leaving ? current : current === module.slug ? null : current))}
            onPointerCancel={() => setPressedSlug((current) => (leaving ? current : current === module.slug ? null : current))}
            onClick={() => enter(module)}><span>{module.title}</span></button>;
      })}
    </nav>
  </main>;
}
