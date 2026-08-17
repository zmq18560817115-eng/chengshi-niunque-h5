"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { getCategoryTheme, placeholderCardId, type CategoryCardFallback } from "@/config/h5-category-themes";
import { SwipeBackPage } from "@/components/h5/SwipeBackPage";
import type { PublicModule } from "@/server/services/public-content-service";

const legacyPlaceholderDescription = "资料整理中，正式发布后可在此查看。";
const legacySeedDescriptions = new Set([
  "DHA、ARA 等核心营养指标检测结果。",
  "查看油脂新鲜度相关检测资料。",
  "重金属、微生物及污染物等安全指标资料。",
  "配方与标签复核资料。",
  "原料与生产工艺复核资料。",
  "稳定性与感官复核资料。",
  "生产主体与资质资料。",
  "生产过程中的质量管理资料。",
]);

function resolveArtworkCopy(card: PublicModule["cards"][number] | null, fallback: CategoryCardFallback) {
  const placeholderTitle = !card || /^第\d+项资料$/.test(card.title.trim());
  const description = card?.description?.trim();
  const placeholderDescription = !description || description === legacyPlaceholderDescription || legacySeedDescriptions.has(description);
  const genericButton = !card?.buttonText?.trim() || ["查看报告", "查看资料"].includes(card.buttonText.trim());
  return {
    title: placeholderTitle ? fallback.title : card?.title ?? fallback.title,
    description: placeholderDescription ? fallback.description : description,
    buttonText: genericButton ? fallback.buttonText : card?.buttonText ?? fallback.buttonText,
  };
}

export function CategoryDetail({ module, preview = false }: { module: PublicModule; preview?: boolean }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const theme = getCategoryTheme(module.slug);
  const slots = useMemo(() => theme.artwork ? Array.from({ length: theme.cardSlots }, (_, index) => module.cards[index] ?? null) : [], [module.cards, theme]);
  useEffect(() => { if (!preview) slots.forEach((card, index) => router.prefetch(`/reports/${module.slug}/items/${card?.id ?? placeholderCardId(index)}/reports`)); }, [module.slug, preview, router, slots]);

  if (!theme.artwork) return <SwipeBackPage className="h5-shell category-page category-page-unknown" fallbackHref="/reports" preview={preview}><p>暂时无法识别该档案分类。</p></SwipeBackPage>;

  return <SwipeBackPage className={`h5-shell category-page category-page-final h5-page-transition ${theme.backgroundClass} ${leaving ? "is-leaving" : ""}`} fallbackHref="/reports" preview={preview} data-category={module.slug} data-theme={theme.theme}>
    <Image className="category-page-art" src={`/design/final-v1/${theme.artwork}`} alt={module.title} width={1000} height={2166} priority sizes="(max-width: 750px) 100vw, 750px"/>
    {module.slug === "inspection-projects" && <>
      <svg className="category-speech-bubble" viewBox="0 0 200 100" aria-hidden="true">
        <path d="M 18 42 C 14 20 40 12 72 10 C 110 8 150 10 172 16 C 192 22 194 44 184 58 C 176 70 152 74 138 72 L 142 74 C 154 88 144 96 132 92 C 122 88 120 78 124 72 C 100 76 60 74 38 68 C 18 62 14 50 18 42 Z" fill="#faf6ee" stroke="#2b2b2b" strokeWidth="2.2" strokeLinejoin="round"/>
        <text x="100" y="50" textAnchor="middle" dominantBaseline="middle" className="category-speech-bubble-text">批次核验</text>
      </svg>
      <span className="category-blush category-blush--left" aria-hidden="true"/>
      <span className="category-blush category-blush--right" aria-hidden="true"/>
    </>}
    <section className="category-card-hotspots" aria-label={`${module.title}报告资料`}>
      {slots.map((card, index) => {
        const layout = theme.cardLayouts[index];
        const fallback = theme.cardFallbacks[index];
        const cardId = card?.id ?? placeholderCardId(index);
        const { title, description, buttonText } = resolveArtworkCopy(card, fallback);
        const label = `${title}，${buttonText}`;
        const copy = <><span className="category-card-copy" aria-hidden="true"><strong>{title}</strong><small>{description}</small><b>{buttonText}</b></span><span className="category-card-status" aria-hidden="true">{fallback.statusText}</span><span className="sr-only">{label}</span></>;
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
