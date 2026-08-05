"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { PublicModule } from "@/server/services/public-content-service";

export function ReportsArchive({ modules, preview = false }: { modules: PublicModule[]; preview?: boolean }) {
  useEffect(() => {
    if (preview) return;
    const saved = sessionStorage.getItem("reports-scroll-y");
    if (saved) requestAnimationFrame(() => window.scrollTo(0, Number(saved)));
    const remember = () => sessionStorage.setItem("reports-scroll-y", String(window.scrollY));
    window.addEventListener("pagehide", remember);
    return () => window.removeEventListener("pagehide", remember);
  }, [preview]);

  return <main className="h5-shell reports-archive">
    <header className="reports-hero"><p className="eyebrow">Honest Nutri</p><h1 className="display">诚实透明档案</h1><p>从检测、复核到生产溯源，公开信息按分类持续更新。</p></header>
    <section className="evidence-strip"><strong>为宝贝把关</strong><span>看清 3 层证据</span></section>
    <section className="report-categories" aria-label="档案分类">
      {modules.map((module, index) => preview ? <article key={module.id} className="category-tile" data-tone={index % 3}><span>0{index + 1}</span><h2>{module.title}</h2><p>{module.description ?? "分类说明待后台补充"}</p><strong>查看 {module.cards.length} 项档案 →</strong></article> :
        <Link key={module.id} href={`/reports/${module.slug}`} className="category-tile" data-tone={index % 3} onClick={() => sessionStorage.setItem("reports-scroll-y", String(window.scrollY))}><span>0{index + 1}</span><h2>{module.title}</h2><p>{module.description ?? "分类说明待后台补充"}</p><strong>查看 {module.cards.length} 项档案 →</strong></Link>)}
    </section>
    <section className="reports-story"><p className="eyebrow">Our promise</p><h2>把看不见的过程，变成看得见的依据</h2><p>此处保留品牌初心与底部插画的结构位置，最终文案及视觉待设计确认。</p></section>
  </main>;
}
