"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AssetOpenMode, AssetType, ContentStatus } from "@prisma/client";
import type { PublicModule } from "@/server/services/public-content-service";
import { createAndPublishAssetAction, createAssetAction, createCardAction, deleteAssetAction, deleteCardAction, updateAssetAction, updateCardAction, updateModuleAction } from "@/app/admin/actions";
import { checkModulePublishReadiness } from "@/server/validation/admin-content";
import { AdminPreview } from "@/components/admin/AdminPreview";

type Asset = { id: string; title: string; description: string | null; assetType: AssetType; openMode: AssetOpenMode; storageKey: string | null; mimeType: string | null; externalUrl: string | null; sortOrder: number; contentStatus: ContentStatus; pages: Array<{ id: string; pageNumber: number; storageKey: string; mimeType: string }> };
type Card = { id: string; title: string; description: string | null; buttonText: string; footerNote: string | null; sortOrder: number; contentStatus: ContentStatus; assets: Asset[] };
type Module = { id: string; title: string; slug: string; description: string | null; sortOrder: number; contentStatus: ContentStatus; cards: Card[] };
type Selection = { type: "module" } | { type: "card"; id: string } | { type: "asset"; id: string };

const statusText = { DRAFT: "草稿", PUBLISHED: "已发布", OFFLINE: "已下线" } as const;
const FieldHelp = ({ children }: { children: React.ReactNode }) => <span className="field-help">{children}</span>;
const StatusSelect = ({ value }: { value: ContentStatus }) => <label>内容状态<FieldHelp>草稿不会展示；发布后上线；下线后保留内容但停止展示。</FieldHelp><select name="status" defaultValue={value}><option value="DRAFT">草稿</option><option value="PUBLISHED">已发布</option><option value="OFFLINE">已下线</option></select></label>;

export function ModuleWorkspace({ initialModule, publishedModules, moduleOrders, saved, published, error, initialSelection }: { initialModule: Module; publishedModules: PublicModule[]; moduleOrders: Array<{ id: string; sortOrder: number }>; saved?: boolean; published?: boolean; error?: string; initialSelection?: Exclude<Selection, { type: "module" }> }) {
  const initialSelectionExists = initialSelection?.type === "card"
    ? initialModule.cards.some((item) => item.id === initialSelection.id)
    : initialSelection?.type === "asset"
      ? initialModule.cards.some((card) => card.assets.some((item) => item.id === initialSelection.id))
      : false;
  const [selection, setSelection] = useState<Selection>(initialSelectionExists && initialSelection ? initialSelection : { type: "module" });
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(initialModule);
  const [checkOpen, setCheckOpen] = useState(false);
  const [treeOpen, setTreeOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const activeCard = selection.type === "card" ? initialModule.cards.find((item) => item.id === selection.id) : undefined;
  const activeAsset = selection.type === "asset" ? initialModule.cards.flatMap((item) => item.assets).find((item) => item.id === selection.id) : undefined;
  const activeCardForAsset = activeAsset ? initialModule.cards.find((item) => item.assets.some((asset) => asset.id === activeAsset.id)) : undefined;
  const checks = useMemo(() => checkModulePublishReadiness(preview), [preview]);
  const ready = checks.every((item) => item.ok);
  const formId = selection.type === "module" ? "module-editor" : selection.type === "card" ? "card-editor" : "asset-editor";
  const selectedStatus = selection.type === "card" ? activeCard?.contentStatus : selection.type === "asset" ? activeAsset?.contentStatus : initialModule.contentStatus;
  const selectedContentName = selection.type === "card" ? "卡片" : "资料";
  const legacyAssetSelected = selection.type === "asset" && activeAsset?.assetType !== "IMAGE";

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function choose(next: Selection) {
    if (dirty && !window.confirm("当前有未保存的修改，确定切换编辑内容吗？")) return;
    setDirty(false); setSelection(next);
  }

  function previewInput(event: React.FormEvent<HTMLDivElement>) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (!target.name) return;
    setDirty(true);
    if (selection.type === "module") setPreview((value) => ({ ...value, ...(target.name === "sortOrder" ? { sortOrder: Number(target.value) } : target.name === "status" ? { contentStatus: target.value as ContentStatus } : ["title", "description", "slug"].includes(target.name) ? { [target.name]: target.value } : {}) }));
    if (selection.type === "card") setPreview((value) => ({ ...value, cards: value.cards.map((card) => card.id === selection.id ? { ...card, ...(target.name === "sortOrder" ? { sortOrder: Number(target.value) } : target.name === "status" ? { contentStatus: target.value as ContentStatus } : ["title", "description", "buttonText", "footerNote"].includes(target.name) ? { [target.name]: target.value } : {}) } : card) }));
    if (selection.type === "asset") setPreview((value) => ({ ...value, cards: value.cards.map((card) => ({ ...card, assets: card.assets.map((asset) => asset.id === selection.id ? { ...asset, ...(target.name === "sortOrder" ? { sortOrder: Number(target.value) } : target.name === "status" ? { contentStatus: target.value as ContentStatus } : target.name === "openMode" ? { openMode: target.value as AssetOpenMode } : ["title", "description", "externalUrl", "storageKey"].includes(target.name) ? { [target.name]: target.value } : {}) } : asset) })) }));
  }

  function submitForm(status?: ContentStatus) {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form?.reportValidity()) return;
    const statusControl = form?.elements.namedItem("status") as HTMLSelectElement | null;
    if (status === "PUBLISHED" && selection.type === "card") {
      const card = preview.cards.find((item) => item.id === selection.id);
      if (!card?.assets.some((asset) => asset.assetType === "IMAGE" && asset.contentStatus === "PUBLISHED")) {
        window.alert("发布失败：请先为这张卡片添加并发布至少一份静态图片报告。");
        return;
      }
    }
    if (statusControl && status) statusControl.value = status;
    setSaving(true);
    form.requestSubmit();
  }

  return <div className="workspace-page"><div className="workspace-heading"><div><Link href="/admin/modules">← 返回内容模块</Link><div><h1>{initialModule.title}</h1><span className={`status-badge status-${initialModule.contentStatus.toLowerCase()}`}>{statusText[initialModule.contentStatus]}</span></div><p>在一个工作台中完成内容结构、编辑和预览。</p></div><div className="workspace-view-switch"><button className="button button-secondary" onClick={() => setTreeOpen((value) => !value)}>内容结构</button><a className="button button-secondary" href="#preview">查看预览</a></div></div>
    {error && <div className="admin-alert admin-alert-error" role="alert"><strong>操作未完成</strong><span>{error}</span></div>}
    {published && <div className="admin-alert admin-alert-success" role="status"><strong>卡片已上线</strong><span>图片报告与卡片已同时发布，已打开的 H5 页面会在数秒内自动更新。</span></div>}
    {saved && <div className="save-message" role="status">内容已保存 · {new Intl.DateTimeFormat("zh-CN", { timeStyle: "short" }).format(new Date())}</div>}
    <div className="workspace" onInput={previewInput}>
      <aside className={`workspace-tree ${treeOpen ? "is-open" : ""}`}><div className="panel-heading"><div><span>内容结构</span><small>点击节点切换编辑对象</small></div><button aria-label="关闭内容结构" onClick={() => setTreeOpen(false)}>×</button></div><button className={`tree-module ${selection.type === "module" ? "is-active" : ""}`} onClick={() => choose({ type: "module" })}><span>分类</span><strong>{initialModule.title}</strong></button><ol className="tree-list">{initialModule.cards.map((card, cardIndex) => <li key={card.id}><button className={selection.type === "card" && selection.id === card.id ? "is-active" : ""} onClick={() => choose({ type: "card", id: card.id })}><span>卡片 {cardIndex + 1} · {statusText[card.contentStatus]}</span><strong>{card.title}</strong></button><ul>{card.assets.map((asset) => <li key={asset.id}><button className={selection.type === "asset" && selection.id === asset.id ? "is-active" : ""} onClick={() => choose({ type: "asset", id: asset.id })}><span>{asset.assetType === "IMAGE" ? `图片报告 · ${Math.max(1, asset.pages.length)} 页` : asset.assetType === "PDF" ? "历史 PDF 报告" : "历史外部链接"} · {statusText[asset.contentStatus]}</span>{asset.title}</button></li>)}</ul></li>)}</ol><details className="tree-add"><summary>＋ 新增卡片</summary><form action={createCardAction} className="mini-form"><input type="hidden" name="moduleId" value={initialModule.id}/><input type="hidden" name="status" value="DRAFT"/><input type="hidden" name="sortOrder" value={initialModule.cards.length * 10 + 10}/><label>卡片名称<input name="title" required placeholder="例如：核心营养含量"/></label><label>卡片说明（选填）<textarea name="description" placeholder="简要说明这张卡片展示什么内容"/></label><p className="mini-form-hint">第一步创建卡片；第二步按“每份报告”上传一组有序图片。</p><button className="button button-primary">创建草稿并添加报告</button></form></details>{initialModule.cards.length === 0 && <p className="tree-empty">先添加一张卡片，再为卡片上传图片报告。</p>}</aside>
      <section className="workspace-editor"><div className="panel-heading"><div><span>{selection.type === "module" ? "编辑模块" : selection.type === "card" ? "编辑卡片" : "编辑资料"}</span><small>{dirty ? "存在未保存修改" : "当前内容已同步"}</small></div></div>
        {selection.type === "module" && <form id="module-editor" action={updateModuleAction} className="admin-form"><input type="hidden" name="id" value={initialModule.id}/><input type="hidden" name="slug" value={initialModule.slug}/><div className="form-section"><h2>基本内容</h2><label>分类名称<FieldHelp>显示在 H5 中的分类标题。</FieldHelp><input name="title" defaultValue={initialModule.title} required maxLength={200}/></label><label>分类说明<FieldHelp>一句话说明本分类包含什么内容。</FieldHelp><textarea name="description" defaultValue={initialModule.description ?? ""}/></label></div><div className="form-section"><h2>排序与状态</h2><label>页面排序<FieldHelp>数字越小，在 H5 页面越靠前。</FieldHelp><input name="sortOrder" type="number" min="0" defaultValue={initialModule.sortOrder}/></label><StatusSelect value={initialModule.contentStatus}/></div></form>}
        {activeCard && <>
          <form id="card-editor" action={updateCardAction} className="admin-form">
            <input type="hidden" name="id" value={activeCard.id}/>
            <input type="hidden" name="moduleId" value={initialModule.id}/>
            <div className="form-section"><h2>基本内容</h2><label>卡片名称<FieldHelp>显示在分类页对应卡片区域。</FieldHelp><input name="title" defaultValue={activeCard.title} required/></label><label>卡片说明<FieldHelp>用于解释报告内容或检测范围。</FieldHelp><textarea name="description" defaultValue={activeCard.description ?? ""}/></label></div>
            <div className="form-section"><h2>报告与排序</h2><div className="report-count-summary"><span>前端按钮实时显示</span><strong>{activeCard.assets.filter((asset) => asset.assetType === "IMAGE" && asset.contentStatus === "PUBLISHED").length > 0 ? `查看${activeCard.assets.filter((asset) => asset.assetType === "IMAGE" && asset.contentStatus === "PUBLISHED").length}份报告` : "暂无报告"}</strong><small>每份已发布静态图片报告计为 1 份；一份报告可以包含多张图片页。</small></div><label>页面排序<FieldHelp>同一分类内数字越小越靠前。</FieldHelp><input name="sortOrder" type="number" min="0" defaultValue={activeCard.sortOrder}/></label><StatusSelect value={activeCard.contentStatus}/></div>
            <details className="advanced-settings"><summary>高级设置</summary><label>补充说明<FieldHelp>显示在报告页底部的简短提示，可不填。</FieldHelp><input name="footerNote" defaultValue={activeCard.footerNote ?? ""}/></label></details>
            <DangerForm action={deleteCardAction} id={activeCard.id} parentName="moduleId" parentId={initialModule.id} label="删除卡片" message="删除后该卡片及其资料不会继续在 H5 展示。资料记录仍会保留为软删除数据。"/>
          </form>
          <details className="asset-create" open={activeCard.assets.length === 0}>
            <summary>第二步：添加一份图片报告</summary>
            <AssetCreateForm cardId={activeCard.id} type="IMAGE" nextSortOrder={activeCard.assets.length * 10 + 10}/>
          </details>
        </>}
        {activeAsset && activeCardForAsset && <form id="asset-editor" action={updateAssetAction} className="admin-form"><input type="hidden" name="id" value={activeAsset.id}/><input type="hidden" name="reportCardId" value={activeCardForAsset.id}/><input type="hidden" name="assetType" value={activeAsset.assetType}/><div className="form-section"><h2>基本内容</h2><label>报告名称<FieldHelp>与前端第四层报告页标题保持一致。</FieldHelp><input name="title" defaultValue={activeAsset.title} required/></label><label>报告说明<FieldHelp>可补充报告日期、版本或图片内容。</FieldHelp><textarea name="description" defaultValue={activeAsset.description ?? ""}/></label></div><div className="form-section"><h2>报告图片</h2>{activeAsset.assetType !== "IMAGE" ? <p className="admin-warning">该历史 PDF/外链类型已停用且不会对外展示。请删除后新建静态图片报告。</p> : <><input type="hidden" name="storageKey" value={activeAsset.storageKey ?? ""}/><label>替换全部图片页<FieldHelp>{`当前 ${Math.max(1, activeAsset.pages.length)} 页；不选择则保留，重新选择会按文件顺序整体替换。单张不超过 10MB，最多 30 张。`}</FieldHelp><input name="files" type="file" multiple accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"/></label></>}<input type="hidden" name="openMode" value="SAME_TAB"/></div><div className="form-section"><h2>排序状态</h2><label>报告排序<FieldHelp>同一卡片内数字越小越靠前。</FieldHelp><input name="sortOrder" type="number" min="0" defaultValue={activeAsset.sortOrder}/></label><StatusSelect value={activeAsset.contentStatus}/></div><DangerForm action={deleteAssetAction} id={activeAsset.id} parentName="reportCardId" parentId={activeCardForAsset.id} label="删除报告" message="删除后整份报告及其所有图片页立即停止在 H5 展示。"/></form>}
      </section>
      <AdminPreview module={preview} publishedModules={publishedModules} moduleOrders={moduleOrders} selection={selection} dirty={dirty} onReset={() => setPreview(initialModule)}/>
    </div>
    <div className="workspace-actionbar"><Link className="button button-secondary" href="/admin/modules" onClick={(event) => { if (dirty && !window.confirm("当前有未保存修改，确定退出编辑吗？")) event.preventDefault(); }}>退出编辑</Link><span className={dirty ? "unsaved" : "saved"}>{saving ? "正在保存…" : dirty ? "存在未保存修改" : saved ? "刚刚已保存" : "内容已保存"}</span>{selection.type === "module" ? <><button className="button button-secondary" disabled={saving} onClick={() => submitForm("DRAFT")}>保存为草稿</button><a className="button button-secondary" href="#preview">预览</a><button className="button button-primary" disabled={saving} onClick={() => setCheckOpen(true)}>发布</button></> : legacyAssetSelected ? <span className="admin-warning">历史 PDF/外链只能删除后改建为图片报告</span> : <><a className="button button-secondary" href="#preview">预览</a>{selectedStatus === "PUBLISHED" ? <><button className="button button-secondary" disabled={saving} onClick={() => submitForm("OFFLINE")}>下线{selectedContentName}</button><button className="button button-primary" disabled={saving} onClick={() => submitForm("PUBLISHED")}>保存已发布{selectedContentName}</button></> : <><button className="button button-secondary" disabled={saving} onClick={() => submitForm("DRAFT")}>保存草稿</button><button className="button button-primary" disabled={saving} onClick={() => submitForm("PUBLISHED")}>保存并发布{selectedContentName}</button></>}</>}</div>
    {checkOpen && <div className="dialog-backdrop" role="presentation" onClick={() => setCheckOpen(false)}><section className="publish-dialog" role="dialog" aria-modal="true" aria-labelledby="publish-title" onClick={(event) => event.stopPropagation()}><p className="eyebrow">发布前检查</p><h2 id="publish-title">确认内容可以公开展示</h2><ul>{checks.map((item) => <li key={item.label} className={item.ok ? "check-ok" : "check-fail"}><strong>{item.ok ? "通过" : "待完善"} · {item.label}</strong><span>{item.detail}</span></li>)}</ul><div><button className="button button-secondary" onClick={() => setCheckOpen(false)}>返回修改</button><button className="button button-primary" disabled={!ready} onClick={() => submitForm("PUBLISHED")}>确认发布</button></div></section></div>}
  </div>;
}

function AssetCreateForm({ cardId, type, nextSortOrder }: { cardId: string; type: AssetType; nextSortOrder: number }) {
  return <form className="mini-form"><input type="hidden" name="reportCardId" value={cardId}/><input type="hidden" name="assetType" value={type}/><input type="hidden" name="status" value="DRAFT"/><input type="hidden" name="openMode" value="SAME_TAB"/><label>报告名称<input name="title" required placeholder="例如：营养成分检测报告"/></label><label>选择报告图片<FieldHelp>一次选择的多张图片共同组成 1 份报告；按文件选择顺序显示，仅支持 JPG、PNG、WebP，单张不超过 10MB，最多 30 张。</FieldHelp><input name="files" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple required/></label><label>报告排序<input name="sortOrder" type="number" min="0" defaultValue={nextSortOrder} required/></label><div className="asset-create-actions"><button className="button button-secondary" formAction={createAssetAction}>保存报告草稿</button><button className="button button-primary" formAction={createAndPublishAssetAction}>发布报告并上线卡片</button></div><p className="mini-form-hint">卡片按钮数量由已发布图片报告数自动生成，不需要手动填写。</p></form>;
}

function DangerForm({ action, id, parentName, parentId, label, message }: { action: (data: FormData) => void | Promise<void>; id: string; parentName?: string; parentId?: string; label: string; message: string }) {
  return <details className="danger-zone"><summary>更多操作</summary><h2>危险操作</h2><p>{message}</p><input type="hidden" name="id" value={id}/>{parentName && <input type="hidden" name={parentName} value={parentId}/>}<button type="submit" className="button button-danger" formAction={action} onClick={(event) => { if (!window.confirm(`${message}\n\n确定继续吗？`)) event.preventDefault(); }}>{label}</button></details>;
}
