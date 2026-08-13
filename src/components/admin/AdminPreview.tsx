"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AssetOpenMode, AssetType, ContentStatus } from "@prisma/client";
import type { PublicModule } from "@/server/services/public-content-service";
import { ModuleDetail } from "@/components/h5/ModuleDetail";
import { H5PageContent } from "@/components/h5/H5PageContent";
import { BrandGuide } from "@/components/h5/BrandGuide";
import { ReportsArchive } from "@/components/h5/ReportsArchive";
import { CategoryDetail } from "@/components/h5/CategoryDetail";

type PreviewAsset = { id: string; title: string; description: string | null; assetType: AssetType; openMode: AssetOpenMode; storageKey: string | null; externalUrl: string | null; sortOrder: number; contentStatus: ContentStatus };
type PreviewCard = { id: string; title: string; description: string | null; buttonText: string; footerNote: string | null; sortOrder: number; contentStatus: ContentStatus; assets: PreviewAsset[] };
export type PreviewModule = { id: string; title: string; slug: string; description: string | null; sortOrder: number; contentStatus: ContentStatus; cards: PreviewCard[] };
export type PreviewSelection = { type: "module" } | { type: "card"; id: string } | { type: "asset"; id: string };

function assetHref(asset: PreviewAsset) {
  if (asset.assetType === "EXTERNAL_LINK") return asset.externalUrl ?? "";
  return asset.storageKey ? `/reports/${asset.assetType === "PDF" ? "pdf" : "image"}/${asset.id}` : "";
}

function toPublicModule(module: PreviewModule): PublicModule {
  return { id: module.id, slug: module.slug, title: module.title || "未填写模块名称", description: module.description, cards: [...module.cards].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)).map((card) => ({ id: card.id, title: card.title || "未填写卡片标题", description: card.description, buttonText: card.buttonText, footerNote: card.footerNote, assets: [...card.assets].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)).map((asset) => ({ id: asset.id, title: asset.title || "尚未配置资料", description: asset.description, type: asset.assetType, href: assetHref(asset), openMode: asset.openMode === "NEW_TAB" ? "new_tab" : "same_tab" })) })) };
}

export function mergePreviewModules(module: PreviewModule, published: PublicModule[], moduleOrders: Array<{ id: string; sortOrder: number }>) {
  const order = new Map(moduleOrders.map((item) => [item.id, item.sortOrder]));
  return [...published.filter((item) => item.id !== module.id), toPublicModule(module)].sort((a, b) => (order.get(a.id) ?? module.sortOrder) - (order.get(b.id) ?? module.sortOrder) || a.id.localeCompare(b.id));
}

function selectedStatus(module: PreviewModule, selection: PreviewSelection): ContentStatus {
  if (selection.type === "module") return module.contentStatus;
  if (selection.type === "card") return module.cards.find((item) => item.id === selection.id)?.contentStatus ?? "DRAFT";
  return module.cards.flatMap((item) => item.assets).find((item) => item.id === selection.id)?.contentStatus ?? "DRAFT";
}

export function AdminPreview({ module, publishedModules, moduleOrders, selection, dirty, onReset }: { module: PreviewModule; publishedModules: PublicModule[]; moduleOrders: Array<{ id: string; sortOrder: number }>; selection: PreviewSelection; dirty: boolean; onReset: () => void }) {
  const [fullOpen, setFullOpen] = useState(false);
  const [deviceWidth, setDeviceWidth] = useState<375 | 390 | 414>(375);
  const [scaleMode, setScaleMode] = useState<"fit" | "actual">("fit");
  const [refreshKey, setRefreshKey] = useState(0);
  const [journeyView, setJourneyView] = useState<"guide" | "archive" | "category" | "report">("category");
  const [availableWidth, setAvailableWidth] = useState(375);
  const stageRef = useRef<HTMLDivElement>(null);
  const current = useMemo(() => toPublicModule(module), [module]);
  const allModules = useMemo(() => mergePreviewModules(module, publishedModules, moduleOrders), [module, publishedModules, moduleOrders]);
  const focus = { moduleId: module.id, cardId: selection.type === "card" ? selection.id : selection.type === "asset" ? module.cards.find((card) => card.assets.some((asset) => asset.id === selection.id))?.id : undefined, assetId: selection.type === "asset" ? selection.id : undefined };
  const status = selectedStatus(module, selection);
  const statusMessage = status === "DRAFT" ? "草稿内容：正式 H5 不展示" : status === "OFFLINE" ? "当前已下线：正式 H5 不展示" : "已发布内容";
  const fitScale = scaleMode === "fit" ? Math.min(1, Math.max(.5, (availableWidth - 32) / deviceWidth)) : 1;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width));
    observer.observe(stage);
    return () => observer.disconnect();
  }, [fullOpen]);

  return <>
    <aside id="preview" className="workspace-preview"><div className="preview-toolbar"><div><strong>预览</strong><span>编辑预览，尚未发布</span></div><div className="preview-mode-tabs preview-journey-tabs" role="tablist">{([['guide','引导页'],['archive','档案首页'],['category','分类详情'],['report','报告页']] as const).map(([value,label]) => <button key={value} className={journeyView === value ? "is-active" : ""} role="tab" aria-selected={journeyView === value} onClick={() => setJourneyView(value)}>{label}</button>)}</div><div className="preview-actions"><button onClick={() => { onReset(); setRefreshKey((value) => value + 1); }}>刷新预览</button><button onClick={() => setFullOpen(true)}>完整页面</button><a href={`/admin/preview/${module.id}`} target="_blank" rel="noreferrer">新窗口打开</a><a className="preview-mobile-close" href="#">关闭</a></div></div>
      <a className="preview-mobile-back" href="#">← 返回编辑内容</a><div className="preview-sync-status"><span className={`status-badge status-${status.toLowerCase()}`}>{statusMessage}</span>{dirty && <strong>存在未保存修改</strong>}</div>
      <div className="module-preview-card" key={`${refreshKey}-${journeyView}`}><div className="module-preview-label">{journeyView === "guide" ? "品牌引导页 · 自动进入已暂停" : journeyView === "archive" ? "档案长首页" : journeyView === "category" ? "当前分类详情" : "当前报告入口与资料"}</div>{journeyView === "guide" ? <BrandGuide preview/> : journeyView === "archive" ? <ReportsArchive modules={allModules} preview/> : journeyView === "category" ? <CategoryDetail module={current} preview/> : <article className="section information-module preview-module-focus" style={{ background: "var(--color-green)" }}><div className="module-trigger"><span className="display module-title">{current.title}</span><span>−</span></div>{current.description && <p className="module-description">{current.description}</p>}<ModuleDetail module={current} previewFocus={focus} previewMode/></article>}</div>
    </aside>
    {fullOpen && <div className="full-preview-backdrop" role="presentation" onClick={() => setFullOpen(false)}><section className="full-preview-dialog" role="dialog" aria-modal="true" aria-label="完整页面预览" onClick={(event) => event.stopPropagation()}><header><div><strong>完整页面预览</strong><span>编辑预览，尚未发布</span></div><div className="device-options" aria-label="设备宽度">{([375, 390, 414] as const).map((width) => <button key={width} className={deviceWidth === width ? "is-active" : ""} onClick={() => setDeviceWidth(width)}>{width}</button>)}</div><div className="scale-options"><button className={scaleMode === "fit" ? "is-active" : ""} onClick={() => setScaleMode("fit")}>适应区域</button><button className={scaleMode === "actual" ? "is-active" : ""} onClick={() => setScaleMode("actual")}>100%</button></div><div className="preview-actions"><button onClick={() => setRefreshKey((value) => value + 1)}>刷新预览</button><a href={`/admin/preview/${module.id}?width=${deviceWidth}`} target="_blank" rel="noreferrer">新窗口打开</a><button aria-label="关闭完整页面预览" onClick={() => setFullOpen(false)}>×</button></div></header><div className="full-preview-stage" ref={stageRef}><div className="full-preview-device" data-device-width={deviceWidth} data-scale-mode={scaleMode} style={{ width: deviceWidth, zoom: fitScale }} key={`${refreshKey}-${deviceWidth}-${scaleMode}`}><div className="admin-preview-ribbon">当前编辑模块已标识 · 不影响正式 H5</div><H5PageContent modules={allModules} previewFocus={focus} previewMode/></div></div></section></div>}
  </>;
}
