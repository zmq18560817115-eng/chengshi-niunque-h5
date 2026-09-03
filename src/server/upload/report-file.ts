import type { AssetType } from "@prisma/client";
import {
  MAX_REPORT_IMAGE_BYTES,
  MAX_REPORT_IMAGE_DIMENSION,
  MAX_REPORT_IMAGE_PIXELS,
  hasMatchingReportImageExtension,
  isStaticReportImageMimeType,
  reportImageExtension,
  type StaticReportImageMimeType,
} from "@/server/report-image-policy";

export { MAX_REPORT_IMAGE_BYTES as MAX_REPORT_FILE_BYTES } from "@/server/report-image-policy";

type ImageDimensions = { width: number; height: number };

function matchesSignature(bytes: Uint8Array, contentType: StaticReportImageMimeType): boolean {
  if (contentType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      .every((value, index) => bytes[index] === value);
  }
  return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

function readUint16BigEndian(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]! << 8) | bytes[offset + 1]!;
}

function readUint24LittleEndian(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16);
}

function isAnimatedPng(bytes: Uint8Array): boolean {
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    if (type === "acTL") return true;
    offset += 12 + length;
  }
  return false;
}

function isAnimatedWebp(bytes: Uint8Array): boolean {
  if (String.fromCharCode(...bytes.slice(12, 16)) === "VP8X" && (bytes[20]! & 0x02) !== 0) return true;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = String.fromCharCode(...bytes.slice(offset, offset + 4));
    if (type === "ANIM" || type === "ANMF") return true;
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset + 4, 4).getUint32(0, true);
    offset += 8 + length + (length % 2);
  }
  return false;
}

function readPngDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 24) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function readJpegDimensions(bytes: Uint8Array): ImageDimensions | null {
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset]!;
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 1 >= bytes.length) break;
    const segmentLength = readUint16BigEndian(bytes, offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf
      && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isStartOfFrame && segmentLength >= 7) {
      return {
        width: readUint16BigEndian(bytes, offset + 5),
        height: readUint16BigEndian(bytes, offset + 3),
      };
    }
    offset += segmentLength;
  }
  return null;
}

function readWebpDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 25) return null;
  const chunk = String.fromCharCode(...bytes.slice(12, 16));
  if (chunk === "VP8X" && bytes.length >= 30) {
    return {
      width: readUint24LittleEndian(bytes, 24) + 1,
      height: readUint24LittleEndian(bytes, 27) + 1,
    };
  }
  if (chunk === "VP8L" && bytes[20] === 0x2f) {
    return {
      width: 1 + bytes[21]! + ((bytes[22]! & 0x3f) << 8),
      height: 1 + (bytes[22]! >> 6) + (bytes[23]! << 2) + ((bytes[24]! & 0x0f) << 10),
    };
  }
  if (chunk === "VP8 " && bytes.length >= 30
    && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    return {
      width: (bytes[26]! | (bytes[27]! << 8)) & 0x3fff,
      height: (bytes[28]! | (bytes[29]! << 8)) & 0x3fff,
    };
  }
  return null;
}

function readImageDimensions(bytes: Uint8Array, contentType: StaticReportImageMimeType): ImageDimensions | null {
  if (contentType === "image/png") return readPngDimensions(bytes);
  if (contentType === "image/jpeg") return readJpegDimensions(bytes);
  return readWebpDimensions(bytes);
}

function validateDimensions(dimensions: ImageDimensions | null): asserts dimensions is ImageDimensions {
  if (!dimensions || dimensions.width < 1 || dimensions.height < 1) {
    throw new Error("无法读取图片尺寸，请重新导出后上传");
  }
  if (dimensions.width > MAX_REPORT_IMAGE_DIMENSION || dimensions.height > MAX_REPORT_IMAGE_DIMENSION) {
    throw new Error(`图片宽高不能超过 ${MAX_REPORT_IMAGE_DIMENSION} 像素`);
  }
  if (dimensions.width * dimensions.height > MAX_REPORT_IMAGE_PIXELS) {
    throw new Error("单张图片总像素不能超过 2500 万");
  }
}

export async function validateReportFile(file: File, assetType: AssetType): Promise<{
  body: Uint8Array;
  contentType: StaticReportImageMimeType;
  extension: "jpg" | "png" | "webp";
  width: number;
  height: number;
}> {
  if (assetType !== "IMAGE") throw new Error("公开报告仅支持上传 JPG、PNG 或 WebP 静态图片");
  if (!file.size) throw new Error("请选择需要上传的图片");
  if (file.size > MAX_REPORT_IMAGE_BYTES) throw new Error("单张报告图片不能超过 10MB");
  if (!isStaticReportImageMimeType(file.type)) throw new Error("报告图片仅支持 JPG、PNG 或 WebP 静态格式");
  if (!hasMatchingReportImageExtension(file.name, file.type)) throw new Error("图片扩展名与所选格式不一致");

  const body = new Uint8Array(await file.arrayBuffer());
  if (!matchesSignature(body, file.type)) throw new Error("文件内容与所选格式不一致，请重新选择文件");
  if ((file.type === "image/png" && isAnimatedPng(body))
    || (file.type === "image/webp" && isAnimatedWebp(body))) {
    throw new Error("报告仅支持静态图片，不能上传动画图片");
  }
  const dimensions = readImageDimensions(body, file.type);
  validateDimensions(dimensions);

  return {
    body,
    contentType: file.type,
    extension: reportImageExtension(file.type),
    width: dimensions.width,
    height: dimensions.height,
  };
}
