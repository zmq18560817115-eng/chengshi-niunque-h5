import Link from "next/link";
import { AdminContentService } from "@/server/services/admin-content-service";

export default async function AdminPage() {
  const stats = await new AdminContentService().dashboard();
  return <main><div className="admin-page-heading"><div><p className="eyebrow">工作概览</p><h1>今天从哪里开始？</h1><p>管理 H5 的模块、卡片与资料。发布前请先在手机预览中检查内容。</p></div><Link className="button button-primary" href="/admin/modules">进入内容管理</Link></div><div className="admin-grid"><section><span>全部模块</span><strong>{stats.total}</strong><small>当前未删除的内容模块</small></section><section><span>待完善草稿</span><strong>{stats.draft}</strong><small>不会在 H5 中显示</small></section><section><span>正在展示</span><strong>{stats.published}</strong><small>已发布且在线</small></section><section><span>已下线</span><strong>{stats.offline}</strong><small>保留内容但不公开展示</small></section></div><section className="admin-section next-step"><h2>推荐工作流程</h2><ol><li><strong>选择内容模块</strong><span>确认模块、卡片和资料的层级结构。</span></li><li><strong>完善内容并预览</strong><span>边编辑边查看 375px 手机效果。</span></li><li><strong>执行发布检查</strong><span>确认标题、排序、资料链接都有效后再发布。</span></li></ol></section></main>;
}
