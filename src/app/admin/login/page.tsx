import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/server/auth/request-session";
import { LoginForm } from "@/components/admin/LoginForm";

export default async function LoginPage() {
  if (await getCurrentAdmin()) redirect("/admin");
  return <main className="admin-shell admin-login"><p className="eyebrow">Administration</p><h1>管理员登录</h1><p>请使用本地初始化的管理员账号登录。</p><LoginForm /></main>;
}
