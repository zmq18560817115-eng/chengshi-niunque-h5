import type { AssetType } from "@prisma/client";

export const MAX_REPORT_FILE_BYTES = 20 * 1024 * 1024;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function matchesSignature(bytes: Uint8Array, contentType: string): boolean {
  if (contentType === "application/pdf") return String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  if (contentType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  if (contentType === "image/gif") return ["GIF87a", "GIF89a"].includes(String.fromCharCode(...bytes.slice(0, 6)));
  if (contentType === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

export async function validateReportFile(file: File, assetType: AssetType): Promise<{ body: Uint8Array; contentType: string; extension: string }> {
  if (assetType === "EXTERNAL_LINK") throw new Error("外部链接不需要上传文件");
  if (!file.size) throw new Error("请选择需要上传的文件");
  if (file.size > MAX_REPORT_FILE_BYTES) throw new Error("单个资料文件不能超过 20MB");
  if (assetType === "PDF" && file.type !== "application/pdf") throw new Error("PDF 资料只能上传 PDF 文件");
  if (assetType === "IMAGE" && !imageTypes.has(file.type)) throw new Error("图片资料仅支持 JPG、PNG、WebP 或 GIF");
  const body = new Uint8Array(await file.arrayBuffer());
  if (!matchesSignature(body, file.type)) throw new Error("文件内容与所选格式不一致，请重新选择文件");
  const extension = file.type === "application/pdf" ? "pdf" : file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  return { body, contentType: file.type, extension };
}
