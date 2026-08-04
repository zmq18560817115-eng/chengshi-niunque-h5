import Link from "next/link";
import { AdminContentService } from "@/server/services/admin-content-service";
import { createModuleAction } from "../../actions";

export default async function ModulesPage() {
  const modules = await new AdminContentService().listModules();
  return <main><h1>模块管理</h1><section><h2>新建模块</h2><form action={createModuleAction} className="admin-form"><input name="title" placeholder="标题" required /><input name="slug" placeholder="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /><textarea name="description" placeholder="说明" /><input name="sortOrder" type="number" min="0" defaultValue="0" required /><select name="status" defaultValue="DRAFT"><option value="DRAFT">草稿</option><option value="PUBLISHED">已发布</option><option value="OFFLINE">已下线</option></select><button>创建</button></form></section><section><h2>现有模块</h2><ul className="admin-list">{modules.map(item => <li key={item.id}><Link href={`/admin/modules/${item.id}`}>{item.title}</Link><span>{item.contentStatus} · 卡片 {item._count.cards} · 排序 {item.sortOrder}</span></li>)}</ul></section></main>;
}
