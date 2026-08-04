import Link from "next/link";
import { requireCurrentAdmin } from "@/server/auth/request-session";
import { logoutAction } from "../actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireCurrentAdmin();
  return <div className="admin-shell"><header className="admin-header"><div><strong>内容管理后台</strong><small>{admin.displayName}</small></div><nav><Link href="/admin">概览</Link><Link href="/admin/modules">模块管理</Link><form action={logoutAction}><button>退出登录</button></form></nav></header>{children}</div>;
}
