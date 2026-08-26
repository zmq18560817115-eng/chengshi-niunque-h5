import Image from "next/image";

export type RuntimeLoadingPhase = "loading" | "leaving";

export function RuntimeLoadingBuffer({
  phase = "loading",
  label = "正在准备页面内容",
  reason = "route",
}: {
  phase?: RuntimeLoadingPhase;
  label?: string;
  reason?: string;
}) {
  return (
    <div className={`runtime-loading-layer is-${phase}`} data-loading-reason={reason}>
      <main className={`guide-loading-buffer is-${phase}`} aria-label="页面加载缓冲" aria-busy={phase === "loading"}>
        <section className="guide-loading-buffer-stage" aria-live="polite">
          <Image
            className="guide-loading-buffer-poster"
            src="/design/guide/data-loading-buffer-poster.webp"
            alt=""
            fill
            sizes="(max-width: 750px) 100vw, 750px"
            priority
            unoptimized
          />
          <Image
            className="guide-loading-buffer-gif"
            src="/design/guide/data-loading-buffer.gif"
            alt={label}
            fill
            sizes="(max-width: 750px) 100vw, 750px"
            priority
            fetchPriority="high"
            unoptimized
          />
          <span className="sr-only">{label}</span>
        </section>
      </main>
    </div>
  );
}
