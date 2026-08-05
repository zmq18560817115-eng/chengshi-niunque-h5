"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { PublicModule } from "@/server/services/public-content-service";
import { defaultH5SiteConfig, type H5SiteConfig } from "@/server/services/h5-site-config";

export function ReportsArchive({ modules, preview = false, config = defaultH5SiteConfig }: { modules: PublicModule[]; preview?: boolean; config?: H5SiteConfig }) {
  useEffect(() => {
    if (preview) return;
    const saved = sessionStorage.getItem("reports-scroll-y");
    if (saved) requestAnimationFrame(() => window.scrollTo(0, Number(saved)));
    const remember = () => sessionStorage.setItem("reports-scroll-y", String(window.scrollY));
    window.addEventListener("pagehide", remember);
    return () => window.removeEventListener("pagehide", remember);
  }, [preview]);

  return <main className="h5-shell reports-archive">
    <header className="reports-hero"><p className="eyebrow">{config.archiveEyebrow}</p><h1 className="display">{config.archiveTitle}</h1><p>{config.archiveDescription}</p></header>
    <section className="evidence-strip"><strong>{config.evidenceTitle}</strong><span>{config.evidenceSubtitle}</span></section>
    <section className="report-categories" aria-label="档案分类">
      {modules.map((module, index) => preview ? <article key={module.id} className="category-tile" data-tone={index % 3}><span>0{index + 1}</span><h2>{module.title}</h2><p>{module.description ?? "分类说明待后台补充"}</p><strong>查看 {module.cards.length} 项档案 →</strong></article> :
        <Link key={module.id} href={`/reports/${module.slug}`} className="category-tile" data-tone={index % 3} onClick={() => sessionStorage.setItem("reports-scroll-y", String(window.scrollY))}><span>0{index + 1}</span><h2>{module.title}</h2><p>{module.description ?? "分类说明待后台补充"}</p><strong>查看 {module.cards.length} 项档案 →</strong></Link>)}
    </section>
    <section className="reports-story"><p className="eyebrow">{config.storyEyebrow}</p><h2>{config.storyTitle}</h2><p>{config.storyDescription}</p></section>
  </main>;
}
