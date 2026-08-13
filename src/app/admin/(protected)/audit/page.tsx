import { AdminContentService } from "@/server/services/admin-content-service";

const actionText: Record<string, string> = { MODULE_CREATE: "创建分类", MODULE_UPDATE: "更新分类", MODULE_DELETE: "删除分类", MODULE_REORDER: "调整分类排序", CARD_CREATE: "创建报告卡片", CARD_UPDATE: "更新报告卡片", CARD_DELETE: "删除报告卡片", ASSET_CREATE: "新增报告资料", ASSET_UPDATE: "更新报告资料", ASSET_DELETE: "删除报告资料", SITE_SETTING_UPDATE: "更新页面内容", SEED_PUBLISH: "初始化发布" };

export default async function AuditPage() {
  const logs = await new AdminContentService().listAuditLogs(100);
  return <main><div className="admin-page-heading"><div><p className="eyebrow">维护留痕</p><h1>操作记录</h1><p>展示最近 100 条内容维护记录，仅供查看，不能在此修改或删除。</p></div></div><section className="admin-section"><div className="module-table-wrap"><table className="module-table audit-table"><thead><tr><th>时间</th><th>操作人员</th><th>操作</th><th>内容类型</th><th>对象编号</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td>{log.createdAt.toLocaleString("zh-CN")}</td><td><strong>{log.operator.displayName}</strong><small>{log.operator.email}</small></td><td>{actionText[log.action] ?? log.action}</td><td>{log.targetType}</td><td><code>{log.targetId ?? "—"}</code></td></tr>)}</tbody></table>{logs.length === 0 && <div className="admin-empty">暂无操作记录。</div>}</div></section></main>;
}
