"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useState, type CSSProperties } from "react";
import { AdaptiveReadinessGate, useAdaptiveReadiness } from "@/components/h5/AdaptiveReadinessGate";
import { getCategoryTheme, placeholderCardId, type CategoryCardFallback } from "@/config/h5-category-themes";
import { SwipeBackPage } from "@/components/h5/SwipeBackPage";
import { H5_MOTION_ENABLED, h5MotionModules } from "@/components/h5/motion/motion-config";
import { pushHierarchyRoute, readCategoryScrollPosition, saveCategoryScrollPosition } from "@/components/h5/hierarchy-navigation";
import { announceCategoryRouteReady, categoryRouteBufferAttribute, categoryRouteBufferedEntrySource, categoryRouteEntryAttribute, categoryRouteEntrySource, categoryRouteMountedEvent, categoryRouteNativeTransitionAttribute } from "@/components/h5/category-route-transition";
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
  if (props.preview || !theme.artworkLayers) return <CategoryDetailReady {...props}/>;
  const requests = theme.readinessAssets.map((src) => ({ src, priority: "high" as const }));
  return <AdaptiveReadinessGate requests={requests} label={`正在准备${theme.label}`} reason="category-assets" settleSelector={`.category-page-final[data-category="${props.module.slug}"]`} settleFrames={3}>
    <CategoryDetailReady {...props}/>
  </AdaptiveReadinessGate>;
}

function CategoryDetailReady({ module, preview = false }: CategoryDetailProps) {
  const router = useRouter();
  const readinessReady = useAdaptiveReadiness();
  const [leaving, setLeaving] = useState(false);
  const [routeEntrySource, setRouteEntrySource] = useState<string | null>(null);
  const [routeReady, setRouteReady] = useState(false);
  const theme = getCategoryTheme(module.slug);
  const motionEnabled = H5_MOTION_ENABLED && h5MotionModules.categoryEnter && !preview;
  const slots = useMemo(() => theme.artworkLayers ? Array.from({ length: theme.cardSlots }, (_, index) => module.cards[index] ?? null) : [], [module.cards, theme]);
  useLayoutEffect(() => {
    if (preview) return;
    const root = document.documentElement;
    root.setAttribute("data-h5-page-lock", "category");
    const page = document.querySelector<HTMLElement>(`.category-page-final[data-category="${module.slug}"]`);
    const initialScroll = readCategoryScrollPosition(module.slug);
    const restoreScroll = () => {
      if (page) page.scrollTop = initialScroll;
      window.scrollTo(0, 0);
    };
    restoreScroll();
    return () => {
      if (root.getAttribute("data-h5-page-lock") === "category") root.removeAttribute("data-h5-page-lock");
    };
  }, [module.slug, preview]);
  useEffect(() => { if (!preview) slots.forEach((card, index) => router.prefetch(`/reports/${module.slug}/items/${card?.id ?? placeholderCardId(index)}/reports`)); }, [module.slug, preview, router, slots]);
  useLayoutEffect(() => {
    if (preview) return;
    const root = document.documentElement;
    if (root.getAttribute(categoryRouteEntryAttribute) !== module.slug) return;
    root.removeAttribute(categoryRouteEntryAttribute);
    window.dispatchEvent(new Event(categoryRouteMountedEvent));
    if (root.hasAttribute(categoryRouteNativeTransitionAttribute)) return;
    if (motionEnabled) {
      setRouteEntrySource(root.hasAttribute(categoryRouteBufferAttribute) ? categoryRouteBufferedEntrySource : categoryRouteEntrySource);
    }
  }, [module.slug, motionEnabled, preview]);
  useLayoutEffect(() => {
    if (!readinessReady || !routeEntrySource) return;
    setRouteReady(true);
  }, [readinessReady, routeEntrySource]);
  useLayoutEffect(() => {
    if (!routeReady) return;
    announceCategoryRouteReady();
  }, [routeReady]);

  if (!theme.artworkLayers) return <SwipeBackPage className="h5-shell category-page category-page-unknown" fallbackHref="/reports" preview={preview} showBackControl={false}><p>暂时无法识别该档案分类。</p></SwipeBackPage>;

  return <SwipeBackPage className={`h5-shell category-page category-page-final ${motionEnabled ? "h5-page-transition" : ""} ${leaving ? "is-leaving" : ""} ${theme.backgroundClass}`} fallbackHref="/reports" preview={preview} showBackControl={false} data-category={module.slug} data-theme={theme.theme} data-route-entry={routeEntrySource ?? undefined} data-route-ready={routeReady || undefined} data-preview={preview || undefined}>
    <div className="category-page-viewport" data-artwork-source="layered-components">
      <div className="category-page-artwork-layers" role="img" aria-label={module.title}>
      {theme.artworkLayers.map((layer) => {
        const style = {
          left: `${layer.x / 2000 * 100}%`,
          top: `${layer.y / 4333 * 100}%`,
          width: `${layer.width / 2000 * 100}%`,
          height: `${layer.height / 4333 * 100}%`,
        } as CSSProperties;
        return <Image key={layer.id} className="category-page-artwork-layer" src={layer.src} alt="" width={layer.width} height={layer.height} style={style} priority unoptimized sizes="(max-width: 750px) 126vw, 945px" data-category-layer={layer.id}/>;
      })}
      </div>
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
        const copy = <><span className="category-card-copy" aria-hidden="true"><strong>{title}</strong><small>{description}</small><b>{buttonText}</b></span>{fallback.statusBaseArtwork ? <span className="category-card-status category-card-decoration" aria-hidden="true"><Image className="category-card-status-art" src={fallback.statusBaseArtwork.src} alt="" width={fallback.statusBaseArtwork.width} height={fallback.statusBaseArtwork.height} unoptimized /></span> : null}<span className="sr-only">{label}</span></>;
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
            const destination = `/reports/${module.slug}/items/${cardId}/reports` as const;
            const page = document.querySelector<HTMLElement>(`.category-page-final[data-category="${module.slug}"]`);
            saveCategoryScrollPosition(module.slug, page?.scrollTop ?? 0);
            pushHierarchyRoute(router, destination);
          }}>{copy}</button>;
      })}
      </section>
    </div>
  </SwipeBackPage>;
}
