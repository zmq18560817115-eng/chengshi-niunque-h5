import Link from "next/link";
import { AdminContentService } from "@/server/services/admin-content-service";

export default async function AdminPage() {
  const stats = await new AdminContentService().dashboard();
  return <main><h1>后台概览</h1><div className="admin-grid"><section><strong>{stats.total}</strong><span>模块总数</span></section><section><strong>{stats.draft}</strong><span>草稿</span></section><section><strong>{stats.published}</strong><span>已发布</span></section><section><strong>{stats.offline}</strong><span>已下线</span></section></div><p><Link href="/admin/modules">进入模块管理</Link></p></main>;
}
