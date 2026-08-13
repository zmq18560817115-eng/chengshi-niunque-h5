import { AdminContentService } from "@/server/services/admin-content-service";
import { ModuleList } from "@/components/admin/ModuleList";

export default async function ModulesPage() {
  const modules = await new AdminContentService().listFormalModules();
  return <main><div className="admin-page-heading"><div><p className="eyebrow">内容管理</p><h1>三个正式分类</h1><p>选择分类后管理卡片、文案和报告资料；页面视觉与内部标识由系统固定。</p></div></div>
    <ModuleList modules={modules.map((item) => ({ id: item.id, title: item.title, contentStatus: item.contentStatus, updatedAt: item.updatedAt.toISOString(), cardCount: item.cards.length, assetCount: item.cards.reduce((sum, card) => sum + card._count.assets, 0) }))}/>
  </main>;
}
