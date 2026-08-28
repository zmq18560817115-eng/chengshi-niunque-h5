"use client";

import Link from "next/link";
import styles from "./report-state.module.css";

export default function ReportsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className={styles.page}>
      <section className={styles.card} role="alert">
        <p className={styles.brand}>Honest Nutri · 诚实纽雀</p>
        <h1>档案暂时没有打开</h1>
        <p>网络或资料服务刚刚开了个小差。你可以重新加载；未完成的浏览不会修改任何内容。</p>
        <div className={styles.actions}>
          <button type="button" onClick={reset}>重新加载档案</button>
          <Link href="/reports">返回档案首页</Link>
        </div>
      </section>
    </main>
  );
}
