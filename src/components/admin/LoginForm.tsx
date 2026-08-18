"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});
  return <form action={action} className="admin-form"><label>管理员账号<span>请输入已配置的管理员用户名。</span><input name="account" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required /></label><label>密码<span>密码区分大小写。</span><input name="password" type="password" autoComplete="current-password" required /></label>{state.error && <p role="alert">{state.error}</p>}<button className="button button-primary" disabled={pending}>{pending ? "正在登录…" : "登录"}</button></form>;
}
