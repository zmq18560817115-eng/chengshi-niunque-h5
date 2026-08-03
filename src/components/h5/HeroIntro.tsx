export function HeroIntro() {
  return <section className="section" data-component="HeroIntro" data-animation-state="placeholder" style={{ minHeight: "76svh", background: "var(--color-yellow)" }}>
    <p className="eyebrow">Honest Nutri · 诚实纽雀</p><h1 className="display">诚实<br />透明档案</h1>
    <div style={{ marginTop: "3rem", padding: "1.25rem", borderRadius: "var(--radius-md)", background: "var(--color-paper)", transform: "rotate(2deg)" }}><strong>最新公开批次</strong><p>批次与检测结论由后台发布</p></div>
    <p className="placeholder-note">首屏结构占位 · 最终切图、文案与过场动画待设计确认</p>
  </section>;
}
