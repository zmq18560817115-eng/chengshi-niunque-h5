"use client";

import { useState } from "react";
import type { PublicAsset } from "@/server/services/public-content-service";

const assetLabels: Record<PublicAsset["type"], string> = {
  PDF: "站内查看 PDF",
  IMAGE: "站内查看大图",
  EXTERNAL_LINK: "打开外部链接",
};

export type H5PreviewFocus = { moduleId?: string; cardId?: string; assetId?: string };

export function ReportViewer({ assets, previewFocus, previewMode = false }: { assets: PublicAsset[]; previewFocus?: H5PreviewFocus; previewMode?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  if (assets.length === 0) return <p data-component="ReportViewer" className="placeholder-note">暂无已发布资料。</p>;

  function testAsset(event: React.MouseEvent<HTMLAnchorElement>, asset: PublicAsset) {
    if (!previewMode) return;
    setError(null);
    if (!asset.href || (asset.type === "EXTERNAL_LINK" && !/^https?:\/\//.test(asset.href))) {
      event.preventDefault();
      setError("资料地址无效，请返回编辑区检查配置。");
      return;
    }
    if (asset.type !== "EXTERNAL_LINK") {
      event.preventDefault();
      setError("文件查看接口尚未开放；当前仅验证资料入口和配置状态。");
    }
  }

  return <>
    <ul data-component="ReportViewer" className="asset-list">
      {assets.map((asset) => <li key={asset.id} className={previewFocus?.assetId === asset.id ? "preview-focus" : undefined}>
        <a href={asset.href || "#"} target={asset.openMode === "new_tab" ? "_blank" : undefined} rel={asset.openMode === "new_tab" ? "noreferrer" : undefined} onClick={(event) => testAsset(event, asset)}>
          <span>{asset.title || "尚未配置资料"}</span><small>{asset.href ? assetLabels[asset.type] : "尚未配置资料"}</small>
        </a>
      </li>)}
    </ul>
    {error && <p className="preview-link-error" role="alert">{error}</p>}
  </>;
}
