"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { removeReportImagesAction, type ReportImagesState } from "@/app/admin/report-image-actions";
import type { ManagedReportCard } from "@/server/services/admin-report-images-service";

function UploadForm({ card, assetId }: { card: ManagedReportCard; assetId?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [fileError, setFileError] = useState("");
  const [state, action, pending] = useActionState(async (_previous: ReportImagesState, form: FormData): Promise<ReportImagesState> => {
    form.delete("files");
    files.forEach((file) => form.append("files", file));
    try {
      const response = await fetch("/api/admin/report-images", {
        method: "POST", headers: { "X-Report-Upload": "1" }, credentials: "same-origin", body: form,
      });
      const result: ReportImagesState = await response.json();
      if (!response.ok) return { error: result.error || "上传未完成，请稍后重试。" };
      if (result.saved) { setFiles([]); router.refresh(); }
      return result;
    } catch { return { error: "上传未完成，请检查网络后重试。" }; }
  }, {});
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);
  const move = (index: number, direction: number) => setFiles((items) => {
    const next = [...items];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    return next;
  });
  return <form action={action} className="admin-form report-upload-form" aria-label={`${card.title}${assetId ? "替换报告图片" : "上传报告图片"}`}>
    <input type="hidden" name="reportCardId" value={card.id}/><input type="hidden" name="assetId" value={assetId ?? ""}/><input type="hidden" name="revision" value={card.revision}/>
    <label>{assetId ? "选择替换图片" : "选择报告图片"}
      <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={pending} onChange={(event) => {
        const selected = [...files, ...Array.from(event.target.files ?? [])];
        event.target.value = "";
        const invalid = selected.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type));
        if (invalid) {
          setFileError("请选择 JPG、PNG 或 WebP 格式的报告图片。");
          return;
        }
        setFileError(""); setFiles(selected);
      }}/>
    </label>
    <p className="field-help">一组图片为一份报告，按下方顺序展示。支持 JPG、PNG、WebP。{assetId ? "保存后整体替换这份报告，其他报告保留。" : "保存后直接在对应报告页展示。"}</p>
    {files.length > 0 && <ol className="report-image-selection">{files.map((file, index) => <li key={`${file.name}-${index}`}>
      {previews[index] && <Image unoptimized src={previews[index]} width={72} height={92} alt={`待上传第 ${index + 1} 页`}/>}
      <span>第 {index + 1} 页 · {file.name}</span>
      <div className="row-actions">
        <button type="button" disabled={pending || index === 0} aria-label={`第 ${index + 1} 页上移`} onClick={() => move(index, -1)}>上移</button>
        <button type="button" disabled={pending || index === files.length - 1} aria-label={`第 ${index + 1} 页下移`} onClick={() => move(index, 1)}>下移</button>
        <button type="button" disabled={pending} aria-label={`移除待上传第 ${index + 1} 页`} onClick={() => setFiles((items) => items.filter((_, itemIndex) => itemIndex !== index))}>移除</button>
      </div>
    </li>)}</ol>}
    {(state.error || fileError) && <p className="admin-alert admin-alert-error" role="alert">{fileError || state.error}</p>}
    {state.saved && !files.length && <p role="status">报告图片已更新。</p>}
    <button className="button button-primary" disabled={pending || !files.length}>{pending ? "正在上传并发布…" : assetId ? "替换并发布" : "上传并发布"}</button>
  </form>;
}

function RemoveForm({ card, assetId }: { card: ManagedReportCard; assetId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(async (previous: { error?: string; saved?: boolean }, form: FormData) => {
    try {
      const result = await removeReportImagesAction(previous, form);
      if (result.saved) router.refresh();
      return result;
    } catch { return { error: "移除未完成，请检查网络后重试。" }; }
  }, {});
  return <form action={action} className="report-remove-form">
    <input type="hidden" name="reportCardId" value={card.id}/><input type="hidden" name="assetId" value={assetId}/><input type="hidden" name="revision" value={card.revision}/>
    {confirming ? <><span>移除这份报告的全部图片？</span><button className="button button-danger" disabled={pending}>{pending ? "正在移除…" : "确认移除"}</button><button className="button" type="button" disabled={pending} onClick={() => setConfirming(false)}>取消</button></> : <button className="button button-danger" type="button" onClick={() => setConfirming(true)}>移除这份报告</button>}
    {state.error && <p role="alert">{state.error}</p>}
  </form>;
}

export function ReportImagesManager({ cards }: { cards: ManagedReportCard[] }) {
  const groups = [...new Set(cards.map((card) => card.slug))];
  return <section id="report-images" className="report-images-manager" aria-labelledby="report-images-heading">
    <div className="admin-section-heading"><div><h2 id="report-images-heading">报告图片</h2><p>找到对应项目，直接上传或替换图片，保存后前端自动同步。</p></div></div>
    {groups.map((slug) => <section key={slug} className="admin-section" id={`reports-${slug}`}>
      <h3>{cards.find((card) => card.slug === slug)?.category}</h3>
      {cards.filter((card) => card.slug === slug).map((card) => <details className="managed-report-card" key={card.id} id={`report-${card.id}`}>
        <summary><strong>{card.title}</strong><span>{card.reports.filter((report) => report.published).length} 份已展示报告</span></summary>
        <div className="managed-report-body"><a href={card.href} target="_blank" rel="noreferrer">查看前端对应页面 ↗</a>
          {card.reports.map((report, index) => <article key={report.id} className="managed-report" aria-label={`${card.title}第 ${index + 1} 份报告`}>
            <header><h4>{report.title}</h4><span>{report.pages.length} 张图片 · {report.published ? "前端展示中" : "尚未展示"}</span></header>
            <ol className="managed-report-thumbnails">{report.pages.map((page, pageIndex) => <li key={page.id}><a href={page.href} target="_blank" rel="noreferrer"><Image src={page.href} width={88} height={112} alt={`${report.title}第 ${pageIndex + 1} 页`} unoptimized/><span>第 {pageIndex + 1} 页</span></a></li>)}</ol>
            <details className="report-replace"><summary>替换这份报告的图片</summary><UploadForm card={card} assetId={report.id}/></details>
            <RemoveForm card={card} assetId={report.id}/>
          </article>)}
          <div className="report-new-upload"><h4>{card.reports.length ? "添加一份报告" : "上传报告图片"}</h4><UploadForm card={card}/></div>
        </div>
      </details>)}
    </section>)}
    {!cards.length && <p role="status">暂无可维护的正式报告项目，请先检查现有数据。</p>}
  </section>;
}
