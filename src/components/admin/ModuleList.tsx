"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { moveModuleAction } from "@/app/admin/actions";

type ModuleRow = { id: string; title: string; contentStatus: "DRAFT" | "PUBLISHED" | "OFFLINE"; updatedAt: string; cardCount: number; assetCount: number };
const statusText = { DRAFT: "草稿", PUBLISHED: "已发布", OFFLINE: "已下线" } as const;
const statusOrder = { PUBLISHED: 0, OFFLINE: 1, DRAFT: 2 } as const;

export function ModuleList({ modules }: { modules: ModuleRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const filtered = useMemo(() => modules.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()) && (status === "ALL" || item.contentStatus === status)).sort((a, b) => statusOrder[a.contentStatus] - statusOrder[b.contentStatus] || modules.findIndex((item) => item.id === a.id) - modules.findIndex((item) => item.id === b.id)), [modules, query, status]);
  return <section className="admin-section" aria-labelledby="module-list-title">
    <div className="admin-section-heading"><div><p className="eyebrow">内容结构</p><h2 id="module-list-title">内容模块</h2></div><span>{filtered.length} 个结果</span></div>
    <div className="admin-toolbar"><label>搜索模块<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入模块名称" /></label><label>状态筛选<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">全部状态</option><option value="DRAFT">草稿</option><option value="PUBLISHED">已发布</option><option value="OFFLINE">已下线</option></select></label></div>
    {filtered.length === 0 ? <div className="admin-empty"><strong>没有找到符合条件的模块</strong><p>调整搜索条件，或在上方创建新模块。</p></div> : <div className="module-table-wrap"><table className="module-table"><thead><tr><th>模块名称</th><th>状态</th><th>内容数量</th><th>最后修改</th><th>操作</th></tr></thead><tbody>{filtered.map((item, index) => { const stateItems = filtered.filter((module) => module.contentStatus === item.contentStatus); const stateIndex = stateItems.findIndex((module) => module.id === item.id); const startsGroup = index === 0 || filtered[index - 1].contentStatus !== item.contentStatus; return <Fragment key={item.id}>{startsGroup && <tr className={`module-state-heading state-${item.contentStatus.toLowerCase()}`}><td colSpan={5}>{statusText[item.contentStatus]}内容 <small>{stateItems.length} 项{item.contentStatus === "PUBLISHED" ? " · 顺序与正式 H5 一致" : ""}</small></td></tr>}<tr><td><strong>{item.title}</strong></td><td><span className={`status-badge status-${item.contentStatus.toLowerCase()}`}>{statusText[item.contentStatus]}</span></td><td>{item.cardCount} 张卡片 · {item.assetCount} 条资料</td><td>{new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.updatedAt))}</td><td><div className="row-actions"><Link className="button button-primary" href={`/admin/modules/${item.id}`}>编辑内容</Link><Link className="button button-secondary" href={`/admin/modules/${item.id}#preview`}>手机预览</Link><form action={moveModuleAction}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="direction" value="up"/><button className="button button-secondary" disabled={stateIndex === 0} aria-label={`上移 ${item.title}`}>上移</button></form><form action={moveModuleAction}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="direction" value="down"/><button className="button button-secondary" disabled={stateIndex === stateItems.length - 1} aria-label={`下移 ${item.title}`}>下移</button></form></div></td></tr></Fragment>; })}</tbody></table></div>}
  </section>;
}
