"use client";

import { useState } from "react";
import Image from "next/image";
import type { PublicAsset } from "@/server/services/public-content-service";

export function ImageReportViewer({ asset }: { asset: PublicAsset }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [scale, setScale] = useState(1);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const src = asset.href;
  return <article className={`image-report ${fullscreen ? "is-fullscreen" : ""}`}><header><h2>{asset.title}</h2><div><button type="button" onClick={() => setScale((value) => Math.max(1, value - .25))} aria-label="缩小">−</button><button type="button" onClick={() => setScale((value) => Math.min(3, value + .25))} aria-label="放大">＋</button><button type="button" onClick={() => setFullscreen((value) => !value)}>{fullscreen ? "关闭" : "全屏"}</button></div></header>{failed ? <div className="report-error" role="alert"><p>报告图片加载失败。</p><button type="button" onClick={() => { setFailed(false); setRetry((value) => value + 1); }}>重试</button></div> : <div className="report-image-stage"><Image key={retry} unoptimized width={1200} height={1600} src={src} alt={asset.title} style={{ transform: `scale(${scale})` }} onError={() => setFailed(true)} /></div>}</article>;
}
