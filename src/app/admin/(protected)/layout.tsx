import Link from "next/link";
import { requireCurrentAdmin } from "@/server/auth/request-session";
import { logoutAction } from "../actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireCurrentAdmin();
  return <div className="admin-shell"><header className="admin-header"><div className="admin-brand"><strong>诚实纽雀内容后台</strong><small>{admin.displayName}</small></div><nav aria-label="后台主导航"><Link href="/admin">工作概览</Link><Link href="/admin/site">H5 页面设置</Link><Link href="/admin/modules">分类与报告</Link><a href="/" target="_blank" rel="noreferrer">查看 H5</a><form action={logoutAction}><button className="button-link">退出登录</button></form></nav></header>{children}</div>;
}
