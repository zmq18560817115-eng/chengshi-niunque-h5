"use client";

import { useRouter } from "next/navigation";

export default function ReportsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  return <main className="public-error-page">
    <section className="public-error-card" role="alert" aria-live="assertive">
      <p className="public-error-brand">Honest Nutri · 诚实纽雀</p>
      <h1>档案暂时没有加载出来</h1>
      <p>网络、数据库或图片存储可能正在恢复。你可以重新加载，也可以先返回档案首页。</p>
      <div className="public-error-actions">
        <button className="button button-primary" type="button" onClick={reset}>重新加载</button>
        <button className="button button-secondary" type="button" onClick={() => router.replace("/reports")}>返回档案首页</button>
      </div>
    </section>
  </main>;
}
