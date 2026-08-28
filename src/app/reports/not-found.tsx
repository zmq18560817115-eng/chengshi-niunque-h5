import Link from "next/link";
import styles from "./report-state.module.css";

export default function ReportsNotFound() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.brand}>Honest Nutri · 诚实纽雀</p>
        <h1>这份档案暂未找到</h1>
        <p>它可能尚未发布、已经下线，或链接已经失效。请回到档案首页选择当前可查看的报告。</p>
        <div className={styles.actions}>
          <Link href="/reports">返回档案首页</Link>
          <Link href="/go">返回品牌引导</Link>
        </div>
      </section>
    </main>
  );
}
