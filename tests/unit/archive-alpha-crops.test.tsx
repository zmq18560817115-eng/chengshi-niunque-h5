import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import { ArchiveArtwork } from "@/components/h5/ArchiveArtwork";

const runtimeRoot = "public/design/final-v1/archive/runtime-layers";
const masterWidth = 1000;
const masterHeight = 5557;

const crops = [
  { id: "module-1-folder-back", file: "module-1-folder-back.alpha-crop.webp", source: [1517, 2167], pixels: [1338, 1752], layout: [-288, 276, 1338, 1752] },
  { id: "module-1-folder-front", file: "module-1-folder-front.alpha-crop.webp", source: [1517, 2167], pixels: [1160, 1676], layout: [-212, 262, 1160, 1676] },
  { id: "module-1-logo", file: "module-1-logo.alpha-crop.webp", source: [1517, 2167], pixels: [260, 91], layout: [69, 389, 260, 91] },
  { id: "module-1-title", file: "module-1-title.alpha-crop.webp", source: [1517, 2167], pixels: [632, 403], layout: [41, 505, 632, 403] },
  { id: "module-1-badge", file: "module-1-badge.alpha-crop.webp", source: [1517, 2167], pixels: [962, 1158], layout: [121, 591, 962, 1158] },
  { id: "module-1-batch-coil", file: "module-1-batch-coil.alpha-crop.webp", source: [1517, 2167], pixels: [465, 100], layout: [22, 1582, 465, 100] },
  { id: "module-1-batch", file: "module-1-batch.alpha-crop.webp", source: [1517, 2167], pixels: [402, 158], layout: [57, 1602, 402, 158] },
  { id: "module-1-passed-panel", file: "module-1-passed-panel.alpha-crop.webp", source: [1517, 2167], pixels: [904, 453], layout: [-120, 1581, 904, 453] },
  { id: "module-1-passed-copy", file: "module-1-passed-copy.alpha-crop.webp", source: [1517, 2167], pixels: [628, 113], layout: [63, 1821, 628, 113] },
  { id: "module-2-inspection-folder", file: "module-2-inspection-folder.alpha-crop.png", source: [2893, 4572], pixels: [2326, 2981], layout: [-128.5, 2745.5, 1163, 1490.5] },
  { id: "module-2-review-folder", file: "module-2-review-folder.alpha-crop.png", source: [2893, 4572], pixels: [2326, 2202], layout: [-118.5, 3126, 1163, 1101] },
  { id: "module-2-production-folder", file: "module-2-production-folder.alpha-crop.png", source: [2893, 4572], pixels: [2326, 1743], layout: [-120.5, 3482.5, 1163, 871.5] },
  { id: "module-2-resource-21", file: "module-2-resource-21.alpha-crop.png", source: [1457, 543], pixels: [1398, 529], layout: [137.5, 3829, 699, 264.5] },
] as const;

function imageDimensions(file: string) {
  const bytes = readFileSync(`${runtimeRoot}/${file}`);
  if (file.endsWith(".png")) {
    expect(bytes.subarray(1, 4).toString("ascii")).toBe("PNG");
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)] as const;
  }
  expect(bytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
  expect(bytes.subarray(8, 12).toString("ascii")).toBe("WEBP");
  expect(bytes.subarray(12, 16).toString("ascii")).toBe("VP8L");
  expect(bytes[20]).toBe(0x2f);
  const packed = bytes.readUInt32LE(21);
  return [(packed & 0x3fff) + 1, ((packed >>> 14) & 0x3fff) + 1] as const;
}

describe("archive alpha-cropped runtime layers", () => {
  it("ships every derived crop at its exact alpha-bbox dimensions", () => {
    for (const crop of crops) expect(imageDimensions(crop.file)).toEqual(crop.pixels);
  });

  it("restores every crop to the original absolute coordinate and scale", () => {
    const { container } = render(<ArchiveArtwork preview />);
    for (const crop of crops) {
      const image = container.querySelector<HTMLImageElement>(`[data-source-part="${crop.id}"]`);
      expect(image).not.toBeNull();
      if (!image) continue;
      const [left, top, width, height] = crop.layout;
      expect(image.getAttribute("src")).toContain(crop.file);
      expect(Number(image.getAttribute("width"))).toBeCloseTo(width, 6);
      expect(Number(image.getAttribute("height"))).toBeCloseTo(height, 6);
      expect(Number.parseFloat(image.style.left) * masterWidth / 100).toBeCloseTo(left, 6);
      expect(Number.parseFloat(image.style.top) * masterHeight / 100).toBeCloseTo(top, 6);
      expect(Number.parseFloat(image.style.width) * masterWidth / 100).toBeCloseTo(width, 6);
      expect(Number.parseFloat(image.style.height) * masterHeight / 100).toBeCloseTo(height, 6);
    }
  });

  it("reduces theoretical decoded RGBA allocation by at least two thirds", () => {
    const before = crops.reduce((total, crop) => total + crop.source[0] * crop.source[1] * 4, 0);
    const after = crops.reduce((total, crop) => total + crop.pixels[0] * crop.pixels[1] * 4, 0);
    expect(before).toBe(280_230_360);
    expect(after).toBe(92_482_392);
    expect(1 - after / before).toBeGreaterThan(.66);
  });
});
