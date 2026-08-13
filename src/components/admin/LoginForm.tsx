"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});
  return <form action={action} className="admin-form"><label>管理员邮箱<span>请输入本地初始化的测试管理员邮箱。</span><input name="email" type="email" autoComplete="username" required /></label><label>密码<span>密码区分大小写。</span><input name="password" type="password" autoComplete="current-password" required /></label>{state.error && <p role="alert">{state.error}</p>}<button className="button button-primary" disabled={pending}>{pending ? "正在登录…" : "登录"}</button></form>;
}
