import Link from "next/link";
import type { PublicModule } from "@/server/services/public-content-service";

export function CategoryDetail({ module, preview = false }: { module: PublicModule; preview?: boolean }) {
  return <main className="h5-shell category-page"><header><Link href="/reports" aria-label="返回档案首页">← 返回</Link><p className="eyebrow">透明档案分类</p><h1>{module.title}</h1>{module.description && <p>{module.description}</p>}</header><section className="category-items">{module.cards.length ? module.cards.map((card) => <article key={card.id}><h2>{card.title}</h2>{card.description && <p>{card.description}</p>}<div><span>{card.assets.length} 份资料</span>{preview ? <button type="button">{card.buttonText}</button> : <Link href={`/reports/${module.slug}/items/${card.id}/reports`}>{card.buttonText || "查看报告"}</Link>}</div>{card.footerNote && <small>{card.footerNote}</small>}</article>) : <p className="placeholder-note">该分类暂无已发布档案。</p>}</section></main>;
}
