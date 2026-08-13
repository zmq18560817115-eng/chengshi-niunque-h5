import Link from "next/link";
import { AdminContentService } from "@/server/services/admin-content-service";

export default async function AdminPage() {
  const stats = await new AdminContentService().dashboard();
  return <main>
    <div className="admin-page-heading">
      <div><p className="eyebrow">内容维护工作台</p><h1>H5 内容概览</h1><p>维护分类、卡片与报告资料；固定视觉文案、布局、字体、颜色和动画由前端版本统一管理。</p></div>
      <div className="row-actions"><Link className="button button-primary" href="/admin/modules">管理报告资料</Link></div>
    </div>
    <div className="admin-grid">
      <section><span>全部分类</span><strong>{stats.total}</strong><small>当前未删除的档案分类</small></section>
      <section><span>待处理草稿</span><strong>{stats.draft + stats.draftCards + stats.draftAssets}</strong><small>{stats.draft} 个分类 · {stats.draftCards} 张卡片 · {stats.draftAssets} 条资料</small></section>
      <section><span>正在展示</span><strong>{stats.published}</strong><small>已发布且在线的分类</small></section>
      <section><span>已下线</span><strong>{stats.offline}</strong><small>保留内容但不公开展示</small></section>
    </div>
  </main>;
}
