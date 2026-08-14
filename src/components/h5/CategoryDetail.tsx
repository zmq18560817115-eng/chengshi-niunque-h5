"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { getCategoryTheme, placeholderCardId } from "@/config/h5-category-themes";
import { SwipeBackPage } from "@/components/h5/SwipeBackPage";
import type { PublicModule } from "@/server/services/public-content-service";

export function CategoryDetail({ module, preview = false }: { module: PublicModule; preview?: boolean }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const theme = getCategoryTheme(module.slug);
  const slots = useMemo(() => theme.artwork ? Array.from({ length: theme.cardSlots }, (_, index) => module.cards[index] ?? null) : [], [module.cards, theme]);
  useEffect(() => { if (!preview) slots.forEach((card, index) => router.prefetch(`/reports/${module.slug}/items/${card?.id ?? placeholderCardId(index)}/reports`)); }, [module.slug, preview, router, slots]);

  if (!theme.artwork) return <SwipeBackPage className="h5-shell category-page category-page-unknown" fallbackHref="/reports" preview={preview}><p>暂时无法识别该档案分类。</p></SwipeBackPage>;

  return <SwipeBackPage className={`h5-shell category-page category-page-final h5-page-transition ${theme.backgroundClass} ${leaving ? "is-leaving" : ""}`} fallbackHref="/reports" preview={preview} data-category={module.slug} data-theme={theme.theme}>
    <Image className="category-page-art" src={`/design/final-v1/${theme.artwork}`} alt={module.title} width={1000} height={2166} priority sizes="(max-width: 750px) 100vw, 750px"/>
    <section className="category-card-hotspots" aria-label={`${module.title}报告资料`}>
      {slots.map((card, index) => {
        const layout = theme.cardLayouts[index];
        const cardId = card?.id ?? placeholderCardId(index);
        const label = card ? `${card.title}，查看${card.assets.length}份资料` : `第${index + 1}项资料，资料整理中`;
        const copy = <><span className="category-card-copy" aria-hidden="true"><strong>{card?.title ?? `第${index + 1}项资料`}</strong><small>{card?.description ?? "资料整理中，正式发布后可在此查看。"}</small><b>{card ? (card.buttonText || `查看${card.assets.length}份报告`) : "查看报告"}</b></span><span className="sr-only">{label}</span></>;
        const style = {
          "--category-card-x": layout.x,
          "--category-card-y": layout.y,
          "--category-card-width": layout.width,
          "--category-card-height": layout.height,
          "--category-copy-x": layout.contentX,
          "--category-copy-y": layout.contentY,
          "--category-copy-width": layout.contentWidth,
        } as CSSProperties;
        return preview ? <article key={cardId} className="category-card-hotspot" data-index={index} style={style}>{copy}</article> :
          <button key={cardId} type="button" className="category-card-hotspot" data-index={index} style={style} data-card-id={cardId} data-placeholder={!card || undefined} aria-label={label} disabled={leaving} onClick={() => { if (leaving) return; setLeaving(true); window.setTimeout(() => router.push(`/reports/${module.slug}/items/${cardId}/reports`), 220); }}>{copy}</button>;
      })}
    </section>
  </SwipeBackPage>;
}
