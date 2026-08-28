import { notFound } from "next/navigation";
import { requireCurrentAdmin } from "@/server/auth/request-session";
import { AdminContentService } from "@/server/services/admin-content-service";
import { PublicContentService, type PublicModule } from "@/server/services/public-content-service";
import { H5PageContent } from "@/components/h5/H5PageContent";

export default async function StandaloneAdminPreview({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ width?: string }> }) {
  await requireCurrentAdmin();
  const { id } = await params;
  const adminService = new AdminContentService();
  const [module, publicContent, rows] = await Promise.all([adminService.getModuleWorkspace(id), new PublicContentService().getContent(), adminService.listModules()]);
  if (!module) notFound();
  const requestedWidth = Number((await searchParams).width);
  const width = ([375, 390, 414].includes(requestedWidth) ? requestedWidth : 375) as 375 | 390 | 414;
  const previewModule: PublicModule = { id: module.id, slug: module.slug, title: module.title, description: module.description, cards: module.cards.map((card) => { const images = card.assets.filter((asset) => asset.assetType === "IMAGE"); return { id: card.id, title: card.title, description: card.description, buttonText: images.length ? `查看${images.length}份报告` : "暂无报告", footerNote: card.footerNote, assets: images.map((asset) => ({ id: asset.id, title: asset.title, description: asset.description, type: "IMAGE", href: asset.storageKey ? `/reports/image/${asset.id}` : "", openMode: "same_tab", pages: asset.pages.map((page) => ({ id: page.id, pageNumber: page.pageNumber, href: `/reports/image/page/${page.id}` })) })) }; }) };
  const order = new Map(rows.map((item) => [item.id, item.sortOrder]));
  const modules = [...publicContent.modules.filter((item) => item.id !== module.id), previewModule].sort((a, b) => (order.get(a.id) ?? module.sortOrder) - (order.get(b.id) ?? module.sortOrder) || a.id.localeCompare(b.id));
  return <main className="standalone-preview"><header><div><strong>完整页面预览</strong><span>编辑预览，尚未发布 · {width}px</span></div><a href={`/admin/modules/${module.id}`}>返回编辑工作台</a></header><div className="standalone-preview-scroll"><div style={{ width }}><div className="admin-preview-ribbon">当前编辑模块已标识 · 不影响正式 H5</div><H5PageContent modules={modules} previewFocus={{ moduleId: module.id }} previewMode/></div></div></main>;
}
