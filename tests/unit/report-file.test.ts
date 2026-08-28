import { validateReportFile } from "@/server/upload/report-file";

describe("report file validation", () => {
  function serverFile(content: Uint8Array, name: string, type: string): File {
    return { name, type, size: content.byteLength, arrayBuffer: async () => content.buffer } as File;
  }

  it("accepts a real PDF signature", async () => {
    const file = serverFile(new TextEncoder().encode("%PDF-1.7 test"), "report.pdf", "application/pdf");
    await expect(validateReportFile(file, "PDF")).resolves.toMatchObject({ contentType: "application/pdf", extension: "pdf" });
  });

  it("rejects a spoofed image MIME type", async () => {
    const file = serverFile(new TextEncoder().encode("not-a-png"), "report.png", "image/png");
    await expect(validateReportFile(file, "IMAGE")).rejects.toThrow(/文件内容/);
  });
});
