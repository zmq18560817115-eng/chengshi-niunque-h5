import Link from "next/link";
import { requireCurrentAdmin } from "@/server/auth/request-session";
import { logoutAction } from "../actions";

// 后台受保护页读取会话 Cookie 与实时数据库内容，本就按请求渲染，
// 显式标记为动态以避免构建期预渲染连库（构建不再依赖可达数据库）。
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireCurrentAdmin();
  return <div className="admin-shell">
    <header className="admin-header">
      <div className="admin-brand"><strong>诚实纽雀内容后台</strong><small>{admin.displayName}</small></div>
      <nav aria-label="后台主导航">
        <Link href="/admin">工作台</Link>
        <Link href="/admin/modules">报告资料</Link>
        <Link href="/admin/audit">操作记录</Link>
        <a href="/" target="_blank" rel="noreferrer">预览 H5</a>
        <form action={logoutAction}><button className="button-link">退出登录</button></form>
      </nav>
    </header>
    {children}
  </div>;
}
