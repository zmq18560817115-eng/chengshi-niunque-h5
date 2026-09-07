import { File as NodeFile } from "node:buffer";
const { admin, publish, revalidate } = vi.hoisted(() => ({ admin: vi.fn(), publish: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/server/auth/request-session", () => ({ getCurrentAdmin: admin }));
vi.mock("@/server/services/admin-report-images-service", () => ({ AdminReportImagesService: class { publish = publish; } }));
vi.mock("next/cache", () => ({ revalidatePath: revalidate }));
import { POST } from "@/app/api/admin/report-images/route";

describe("report image upload endpoint", () => {
  beforeEach(() => { vi.clearAllMocks(); admin.mockResolvedValue({ id: "operator" }); });
  afterEach(() => vi.unstubAllGlobals());
  function request(form = new FormData(), headers: Record<string, string> = { "X-Report-Upload": "1" }) {
    const request = new Request("http://localhost/api/admin/report-images", { method: "POST", headers });
    vi.spyOn(request, "formData").mockResolvedValue(form);
    return request;
  }
  it("authenticates before parsing the upload body", async () => {
    admin.mockResolvedValue(null);
    const input = request();
    expect((await POST(input)).status).toBe(401);
    expect(input.formData).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });
  it.each<Record<string, string>>([{}, { "X-Report-Upload": "1", "Sec-Fetch-Site": "cross-site" }])("rejects cross-site form submission before reading images", async (headers) => {
    const input = request(new FormData(), headers);
    const response = await POST(input);
    expect(response.status).toBe(403);
    expect(response.headers.has("Access-Control-Allow-Origin")).toBe(false);
    expect(input.formData).not.toHaveBeenCalled();
  });
  it("accepts only files and fixed report identifiers, never editable copy or storage keys", async () => {
    const form = new FormData();
    form.set("reportCardId", "card"); form.set("assetId", "asset"); form.set("revision", "revision");
    form.set("title", "tampered"); form.set("status", "OFFLINE"); form.set("storageKey", "another.png");
    const file = new File(["image"], "report.png", { type: "image/png" }); form.append("files", file); form.append("files", "not a file");
    const response = await POST(request(form));
    expect(await response.json()).toEqual({ saved: true });
    expect(publish).toHaveBeenCalledWith({ reportCardId: "card", assetId: "asset", revision: "revision", files: [file] }, "operator");
    expect(revalidate).toHaveBeenCalledWith("/reports", "layout");
    expect(revalidate).toHaveBeenCalledWith("/api/public/content");
  });
  it("returns validation failures without invalidating public content", async () => {
    publish.mockRejectedValueOnce(new Error("图片没有保存"));
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "图片没有保存" });
    expect(revalidate).not.toHaveBeenCalled();
  });
  it("parses a real multipart image payload exceeding the former 105MB request limit", async () => {
    // Request uses Node's multipart parser; JSDOM's File fails its native brand check.
    vi.stubGlobal("File", NodeFile);
    const boundary = "report-upload-regression";
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="reportCardId"\r\n\r\ncard\r\n--${boundary}\r\nContent-Disposition: form-data; name="revision"\r\n\r\nrevision\r\n--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="large.png"\r\nContent-Type: image/png\r\n\r\n`),
      Buffer.alloc(106 * 1024 * 1024),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const input = new Request("http://localhost/api/admin/report-images", { method: "POST",
      headers: { "X-Report-Upload": "1", "Content-Type": `multipart/form-data; boundary=${boundary}` }, body });
    const response = await POST(input);
    expect(await response.json()).toEqual({ saved: true });
    expect(response.status).toBe(200);
    expect(publish.mock.calls[0][0].files[0].size).toBe(106 * 1024 * 1024);
    expect(publish.mock.calls[0][0].files[0].name).toBe("large.png");
  });
});
