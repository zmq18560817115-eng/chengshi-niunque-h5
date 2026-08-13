"use client";

export default function ModulesError({ reset }: { error: Error; reset: () => void }) {
  return <main><div className="admin-empty error-state" role="alert"><strong>内容模块加载失败</strong><p>请检查网络或数据库连接，然后重试。系统没有修改任何内容。</p><button className="button button-primary" onClick={reset}>重新加载</button></div></main>;
}
