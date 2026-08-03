import type { PublicAsset } from "@/server/services/public-content-service";

const assetLabels: Record<PublicAsset["type"], string> = {
  PDF: "站内查看 PDF",
  IMAGE: "站内查看大图",
  EXTERNAL_LINK: "打开外部链接",
};

export function ReportViewer({ assets }: { assets: PublicAsset[] }) {
  if (assets.length === 0) {
    return <p data-component="ReportViewer" className="placeholder-note">暂无已发布资料。</p>;
  }

  return (
    <ul data-component="ReportViewer" className="asset-list">
      {assets.map((asset) => (
        <li key={asset.id}>
          <a
            href={asset.href}
            target={asset.openMode === "new_tab" ? "_blank" : undefined}
            rel={asset.openMode === "new_tab" ? "noreferrer" : undefined}
          >
            <span>{asset.title}</span>
            <small>{assetLabels[asset.type]}</small>
          </a>
        </li>
      ))}
    </ul>
  );
}
