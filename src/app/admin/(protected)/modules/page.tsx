import { AdminContentService } from "@/server/services/admin-content-service";
import { createModuleAction } from "../../actions";
import { ModuleList } from "@/components/admin/ModuleList";

export default async function ModulesPage() {
  const modules = await new AdminContentService().listModules();
  return <main><div className="admin-page-heading"><div><p className="eyebrow">内容管理</p><h1>内容模块</h1><p>按照 H5 的展示顺序组织模块，再进入工作台编辑卡片和资料。</p></div></div>
    <details className="create-panel"><summary className="button button-primary">新建内容模块</summary><form action={createModuleAction} className="admin-form"><div className="form-section"><h2>基本内容</h2><label>模块名称<span>显示在 H5 首页，例如“检测项目”。</span><input name="title" placeholder="例如：检测项目" required /></label><label>模块说明<span>简要说明这个模块包含哪些内容。</span><textarea name="description" placeholder="例如：查看产品检测结果和公开报告" /></label></div><div className="form-section"><h2>排序状态</h2><label>页面排序<span>数字越小，在 H5 中越靠前。</span><input name="sortOrder" type="number" min="0" defaultValue="0" required /></label><label>内容状态<select name="status" defaultValue="DRAFT"><option value="DRAFT">草稿</option><option value="PUBLISHED">已发布</option><option value="OFFLINE">已下线</option></select></label></div><details className="advanced-settings"><summary>高级设置</summary><label>内部标识（选填）<span>留空时由系统自动生成；如需填写，只能使用小写英文、数字和短横线。</span><input name="slug" placeholder="inspection-projects" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label></details><button className="button button-primary">创建并开始编辑</button></form></details>
    <ModuleList modules={modules.map((item) => ({ id: item.id, title: item.title, contentStatus: item.contentStatus, updatedAt: item.updatedAt.toISOString(), cardCount: item.cards.length, assetCount: item.cards.reduce((sum, card) => sum + card._count.assets, 0) }))}/>
  </main>;
}
