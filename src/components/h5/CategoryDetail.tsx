"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useState, type CSSProperties } from "react";
import { AdaptiveReadinessGate, useAdaptiveReadiness } from "@/components/h5/AdaptiveReadinessGate";
import { getCategoryTheme, placeholderCardId, type CategoryCardFallback } from "@/config/h5-category-themes";
import { SwipeBackPage } from "@/components/h5/SwipeBackPage";
import { H5_MOTION_ENABLED, h5MotionModules } from "@/components/h5/motion/motion-config";
import { announceCategoryRouteReady, categoryRouteBufferAttribute, categoryRouteBufferedEntrySource, categoryRouteEntryAttribute, categoryRouteEntrySource } from "@/components/h5/category-route-transition";
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
  const reportCount = card?.assets.length ?? 0;
  return {
    title: placeholderTitle ? fallback.title : card?.title ?? fallback.title,
    description: placeholderDescription ? fallback.description : description,
    buttonText: reportCount > 0 ? `查看${reportCount}份报告` : card ? "暂无报告" : fallback.buttonText,
  };
}

type CategoryDetailProps = { module: PublicModule; preview?: boolean };

export function CategoryDetail(props: CategoryDetailProps) {
  const theme = getCategoryTheme(props.module.slug);
  if (props.preview || !theme.artwork) return <CategoryDetailReady {...props}/>;
  const requests = [
    { src: `/design/final-v1/${theme.artwork}`, priority: "high" as const },
    { src: "/design/final-v1/report-texture.webp", priority: "high" as const },
    ...theme.cardLayouts.map((layout) => ({ src: layout.backplate.src, priority: "high" as const })),
  ];
  return <AdaptiveReadinessGate requests={requests} label={`正在准备${theme.label}`} reason="category-assets">
    <CategoryDetailReady {...props}/>
  </AdaptiveReadinessGate>;
}

function CategoryDetailReady({ module, preview = false }: CategoryDetailProps) {
  const router = useRouter();
  const readinessReady = useAdaptiveReadiness();
  const [leaving, setLeaving] = useState(false);
  const [routeEntrySource, setRouteEntrySource] = useState<string | null>(null);
  const [pendingRouteEntrySource, setPendingRouteEntrySource] = useState<string | null>(null);
  const [artworkReady, setArtworkReady] = useState(false);
  const theme = getCategoryTheme(module.slug);
  const motionEnabled = H5_MOTION_ENABLED && h5MotionModules.categoryEnter && !preview;
  const slots = useMemo(() => theme.artwork ? Array.from({ length: theme.cardSlots }, (_, index) => module.cards[index] ?? null) : [], [module.cards, theme]);
  useLayoutEffect(() => {
    if (preview) return;
    const root = document.documentElement;
    root.setAttribute("data-h5-page-lock", "category");
    window.scrollTo(0, 0);
    return () => {
      if (root.getAttribute("data-h5-page-lock") === "category") root.removeAttribute("data-h5-page-lock");
    };
  }, [preview]);
  useEffect(() => { if (!preview) slots.forEach((card, index) => router.prefetch(`/reports/${module.slug}/items/${card?.id ?? placeholderCardId(index)}/reports`)); }, [module.slug, preview, router, slots]);
  useLayoutEffect(() => {
    if (preview) return;
    const root = document.documentElement;
    if (root.getAttribute(categoryRouteEntryAttribute) !== module.slug) return;
    root.removeAttribute(categoryRouteEntryAttribute);
    if (motionEnabled) {
      setPendingRouteEntrySource(root.hasAttribute(categoryRouteBufferAttribute) ? categoryRouteBufferedEntrySource : categoryRouteEntrySource);
    }
  }, [module.slug, motionEnabled, preview]);
  useEffect(() => {
    if (!readinessReady || !pendingRouteEntrySource || !artworkReady) return;
    setRouteEntrySource(pendingRouteEntrySource);
    setPendingRouteEntrySource(null);
  }, [artworkReady, pendingRouteEntrySource, readinessReady]);
  useLayoutEffect(() => {
    if (!readinessReady || !routeEntrySource) return;
    announceCategoryRouteReady();
  }, [readinessReady, routeEntrySource]);

  if (!theme.artwork) return <SwipeBackPage className="h5-shell category-page category-page-unknown" fallbackHref="/reports" preview={preview}><p>暂时无法识别该档案分类。</p></SwipeBackPage>;

  return <SwipeBackPage className={`h5-shell category-page category-page-final ${motionEnabled ? "h5-page-transition" : ""} ${theme.backgroundClass} ${motionEnabled && leaving ? "is-leaving" : ""}`} fallbackHref="/reports" preview={preview} data-category={module.slug} data-theme={theme.theme} data-route-entry={routeEntrySource ?? undefined} data-preview={preview || undefined}>
    <div className="category-page-surround" data-artwork-source="layered-texture" aria-hidden="true">
      <span className="category-page-surround-fill category-page-surround-fill--left" />
      <span className="category-page-surround-fill category-page-surround-fill--right" />
    </div>
    <div className="category-page-viewport">
      <Image className="category-page-art" src={`/design/final-v1/${theme.artwork}`} alt={module.title} width={2000} height={4333} priority unoptimized sizes="(max-width: 750px) 100vw, 750px" onLoad={() => setArtworkReady(true)}/>
      <div className="category-card-backplates" aria-hidden="true">
      {theme.cardLayouts.map((layout, index) => {
        const style = {
          "--category-card-x": layout.x,
          "--category-card-y": layout.y,
          "--category-card-width": layout.width,
          "--category-card-height": layout.height,
        } as CSSProperties;
        return <Image key={layout.backplate.src} className="category-card-backplate" src={layout.backplate.src} alt="" width={layout.backplate.width} height={layout.backplate.height} style={style} priority unoptimized data-index={index}/>;
      })}
      </div>
      <section className="category-card-hotspots" aria-label={`${module.title}报告资料`}>
      {slots.map((card, index) => {
        const layout = theme.cardLayouts[index];
        const fallback = theme.cardFallbacks[index];
        const cardId = card?.id ?? placeholderCardId(index);
        const { title, description, buttonText } = resolveArtworkCopy(card, fallback);
        const label = `${title}，${buttonText}`;
        const statusBaseWidth = fallback.statusBaseArtwork?.width ?? 413;
        const statusStyle = { "--category-status-text-width": `${fallback.statusArtwork.width / statusBaseWidth * 100}%` } as CSSProperties;
        const copy = <><span className="category-card-copy" aria-hidden="true"><strong>{title}</strong><small>{description}</small><b>{buttonText}</b></span><span className="category-card-status" aria-hidden="true" data-status={fallback.statusText} style={statusStyle}>{fallback.statusBaseArtwork ? <Image className="category-card-status-art" src={fallback.statusBaseArtwork.src} alt="" width={fallback.statusBaseArtwork.width} height={fallback.statusBaseArtwork.height} unoptimized /> : null}<Image className="category-card-status-text-art" src={fallback.statusArtwork.src} alt="" width={fallback.statusArtwork.width} height={fallback.statusArtwork.height} /></span><span className="sr-only">{label}</span></>;
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
          <button key={cardId} type="button" className="category-card-hotspot" data-index={index} style={style} data-card-id={cardId} data-placeholder={!card || undefined} aria-label={label} disabled={leaving} onClick={() => {
            if (leaving) return;
            setLeaving(true);
            const destination = `/reports/${module.slug}/items/${cardId}/reports`;
            if (!motionEnabled) { router.push(destination); return; }
            window.setTimeout(() => router.push(destination), 220);
          }}>{copy}</button>;
      })}
      </section>
    </div>
  </SwipeBackPage>;
}
