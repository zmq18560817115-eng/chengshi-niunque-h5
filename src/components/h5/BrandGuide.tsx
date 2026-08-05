"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function BrandGuide({ preview = false, onEnter }: { preview?: boolean; onEnter?: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const startY = useRef<number | null>(null);
  const entering = useRef(false);
  const enter = useCallback(() => {
    if (entering.current || leaving || preview) return;
    entering.current = true;
    setLeaving(true);
    window.setTimeout(() => onEnter ? onEnter() : window.location.assign("/reports"), 260);
  }, [leaving, onEnter, preview]);

  useEffect(() => {
    if (preview) return;
    const timer = window.setTimeout(enter, 3000);
    return () => window.clearTimeout(timer);
  }, [enter, preview]);

  return <main className={`brand-guide ${leaving ? "is-leaving" : ""}`} onClick={enter}
    onTouchStart={(event) => { startY.current = event.touches[0]?.clientY ?? null; }}
    onTouchEnd={(event) => { const end = event.changedTouches[0]?.clientY; if (startY.current !== null && end !== undefined && startY.current - end > 36) enter(); }}>
    <section aria-label="品牌引导页">
      <p className="eyebrow">Honest Nutri · 诚实纽雀</p>
      <h1 className="display">每一份安心<br />都有据可查</h1>
      <p>向上滑动或点击，进入透明档案</p>
      <button type="button" onClick={enter}>进入档案</button>
      <small>{preview ? "后台预览 · 自动跳转已暂停" : "3 秒后自动进入"}</small>
    </section>
  </main>;
}
