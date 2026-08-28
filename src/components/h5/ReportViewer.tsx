"use client";

import { useState } from "react";
import type { PublicAsset } from "@/server/services/public-content-service";

export type H5PreviewFocus = { moduleId?: string; cardId?: string; assetId?: string };

export function ReportViewer({ assets, previewFocus, previewMode = false }: { assets: PublicAsset[]; previewFocus?: H5PreviewFocus; previewMode?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const images = assets.filter((asset) => asset.type === "IMAGE");
  if (images.length === 0) return <p data-component="ReportViewer" className="placeholder-note">暂无已发布图片报告。</p>;

  function testAsset(event: React.MouseEvent<HTMLAnchorElement>, asset: PublicAsset) {
    if (!previewMode) return;
    setError(null);
    if (!asset.href) {
      event.preventDefault();
      setError("资料地址无效，请返回编辑区检查配置。");
      return;
    }
    event.preventDefault();
    setError("当前为编辑预览；正式发布后可在报告页查看图片。");
  }

  return <>
    <ul data-component="ReportViewer" className="asset-list">
      {images.map((asset) => <li key={asset.id} className={previewFocus?.assetId === asset.id ? "preview-focus" : undefined}>
        <a href={asset.href || "#"} onClick={(event) => testAsset(event, asset)}>
          <span>{asset.title || "尚未配置资料"}</span><small>{asset.href ? "站内查看图片" : "尚未配置资料"}</small>
        </a>
      </li>)}
    </ul>
    {error && <p className="preview-link-error" role="alert">{error}</p>}
  </>;
}
