"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { moveModuleAction } from "@/app/admin/actions";

type ModuleRow = { id: string; title: string; contentStatus: "DRAFT" | "PUBLISHED" | "OFFLINE"; updatedAt: string; cardCount: number; assetCount: number };
const statusText = { DRAFT: "草稿", PUBLISHED: "已发布", OFFLINE: "已下线" } as const;

export function ModuleList({ modules }: { modules: ModuleRow[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => modules.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())), [modules, query]);

  return <section className="admin-section" aria-labelledby="module-list-title">
    <div className="admin-section-heading"><div><p className="eyebrow">分类管理</p><h2 id="module-list-title">正式 H5 分类</h2></div><span>{filtered.length} / 3</span></div>
    <div className="admin-toolbar"><label>搜索分类<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入分类名称" /></label></div>
    {filtered.length === 0 ? <div className="admin-empty"><strong>没有找到符合条件的分类</strong><p>请调整搜索条件。</p></div> : <div className="admin-module-cards">{filtered.map((item, index) => <article className="admin-module-card" key={item.id}>
      <header><h3>{item.title}</h3><span className={`status-badge status-${item.contentStatus.toLowerCase()}`}>{statusText[item.contentStatus]}</span></header>
      <dl><div><dt>卡片</dt><dd>{item.cardCount}</dd></div><div><dt>资料</dt><dd>{item.assetCount}</dd></div></dl>
      <p>最后更新：{new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.updatedAt))}</p>
      <div className="row-actions"><Link className="button button-primary" href={`/admin/modules/${item.id}`}>管理内容</Link><Link className="button button-secondary" href={`/admin/modules/${item.id}#preview`}>手机预览</Link><form action={moveModuleAction}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="direction" value="up"/><button className="button button-secondary" disabled={index === 0} aria-label={`上移 ${item.title}`}>上移</button></form><form action={moveModuleAction}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="direction" value="down"/><button className="button button-secondary" disabled={index === filtered.length - 1} aria-label={`下移 ${item.title}`}>下移</button></form></div>
    </article>)}</div>}
  </section>;
}
