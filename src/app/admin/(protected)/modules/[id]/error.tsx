"use client";

import Link from "next/link";

export default function WorkspaceError({ reset }: { error: Error; reset: () => void }) {
  return <main><div className="admin-empty error-state" role="alert"><strong>内容保存或加载失败</strong><p>请检查必填文案、网址格式、文件类型及文件大小后重试。系统不会应用不完整的修改。</p><div className="error-actions"><button className="button button-primary" onClick={reset}>返回重试</button><Link className="button button-secondary" href="/admin/modules">退出工作台</Link></div></div></main>;
}
