"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});
  return <form action={action} className="admin-form"><label>管理员邮箱<input name="email" type="email" autoComplete="username" required /></label><label>密码<input name="password" type="password" autoComplete="current-password" required /></label>{state.error && <p role="alert">{state.error}</p>}<button disabled={pending}>{pending ? "正在登录…" : "登录"}</button></form>;
}
