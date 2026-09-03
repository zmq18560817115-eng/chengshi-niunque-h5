import { MAX_REPORT_FILE_BYTES, validateReportFile } from "@/server/upload/report-file";

describe("report file validation", () => {
  function serverFile(content: Uint8Array, name: string, type: string, size = content.byteLength): File {
    const snapshot = content.slice();
    return { name, type, size, arrayBuffer: async () => snapshot.buffer } as File;
  }

  function png(width = 800, height = 1200): Uint8Array {
    const content = new Uint8Array(24);
    content.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const view = new DataView(content.buffer);
    view.setUint32(16, width);
    view.setUint32(20, height);
    return content;
  }

  it("accepts a static image whose MIME, extension, signature, and dimensions agree", async () => {
    const file = serverFile(png(), "report.PNG", "image/png");
    await expect(validateReportFile(file, "IMAGE")).resolves.toMatchObject({
      contentType: "image/png",
      extension: "png",
      width: 800,
      height: 1200,
    });
  });

  it.each([
    ["PDF", "%PDF-1.7 test", "report.pdf", "application/pdf"],
    ["IMAGE", "GIF89a sample", "report.gif", "image/gif"],
  ] as const)("rejects the disabled %s format", async (assetType, content, name, type) => {
    const file = serverFile(new TextEncoder().encode(content), name, type);
    await expect(validateReportFile(file, assetType)).rejects.toThrow(/仅支持/);
  });

  it("rejects a spoofed image MIME type", async () => {
    const file = serverFile(new TextEncoder().encode("not-a-png"), "report.png", "image/png");
    await expect(validateReportFile(file, "IMAGE")).rejects.toThrow(/文件内容/);
  });

  it("rejects an extension that does not match the MIME type", async () => {
    const file = serverFile(png(), "report.jpg", "image/png");
    await expect(validateReportFile(file, "IMAGE")).rejects.toThrow(/扩展名/);
  });

  it("rejects APNG and animated WebP payloads", async () => {
    const apng = png();
    apng.set(new TextEncoder().encode("acTL"), 12);
    await expect(validateReportFile(serverFile(apng, "animated.png", "image/png"), "IMAGE"))
      .rejects.toThrow(/静态图片/);

    const animatedWebp = new Uint8Array(30);
    animatedWebp.set(new TextEncoder().encode("RIFF"), 0);
    animatedWebp.set(new TextEncoder().encode("WEBP"), 8);
    animatedWebp.set(new TextEncoder().encode("VP8X"), 12);
    animatedWebp[20] = 0x02;
    await expect(validateReportFile(serverFile(animatedWebp, "animated.webp", "image/webp"), "IMAGE"))
      .rejects.toThrow(/静态图片/);
  });

  it("rejects oversized files and decompression-bomb-scale dimensions", async () => {
    const oversized = serverFile(png(), "report.png", "image/png", MAX_REPORT_FILE_BYTES + 1);
    await expect(validateReportFile(oversized, "IMAGE")).rejects.toThrow(/10MB/);

    const hugeDimensions = serverFile(png(10_000, 10_000), "report.png", "image/png");
    await expect(validateReportFile(hugeDimensions, "IMAGE")).rejects.toThrow(/2500 万/);
  });
});
