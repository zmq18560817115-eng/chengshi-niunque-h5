import { proxyReportImage, reportImageUnavailableResponse } from "@/server/http/report-image-response";
import { S3ObjectStorage } from "@/server/storage/s3-object-storage";
import { OperationTimeoutError, withTimeout } from "@/server/utils/with-timeout";

describe("backend recovery boundaries", () => {
  afterEach(() => vi.restoreAllMocks());

  it("ends stalled operations within the configured deadline", async () => {
    await expect(withTimeout(new Promise<never>(() => undefined), 10, "test operation"))
      .rejects.toBeInstanceOf(OperationTimeoutError);
  });

  it("retries a transient signed-object fetch and attaches an abort signal", async () => {
    const storage = new S3ObjectStorage({
      endpoint: "http://127.0.0.1:9000",
      region: "us-east-1",
      bucket: "test",
      accessKeyId: "test",
      secretAccessKey: "test-secret",
      forcePathStyle: true,
      requestTimeoutMs: 1_000,
      maxAttempts: 2,
    });
    vi.spyOn(storage, "createReadUrl").mockResolvedValue("http://127.0.0.1/object");
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("retry", { status: 503 }))
      .mockResolvedValueOnce(new Response("image", { status: 200 }));

    const response = await storage.read("reports/image.png", { ifNoneMatch: "test-etag" });
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("if-none-match")).toBe("test-etag");
  });

  it("aborts a stalled signed-object fetch at the storage deadline", async () => {
    const storage = new S3ObjectStorage({
      endpoint: "http://127.0.0.1:9000",
      region: "us-east-1",
      bucket: "test",
      accessKeyId: "test",
      secretAccessKey: "test-secret",
      forcePathStyle: true,
      requestTimeoutMs: 20,
      maxAttempts: 1,
    });
    vi.spyOn(storage, "createReadUrl").mockResolvedValue("http://127.0.0.1/stalled-object");
    vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      const signal = init?.signal;
      signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
    }));

    await expect(storage.read("reports/stalled.png")).rejects.toMatchObject({ name: "TimeoutError" });
  });

  it("requires private revalidation for revocable images and no-store for recoverable failures", () => {
    const image = proxyReportImage(new Response("image", {
      status: 200,
      headers: { etag: "test-etag", "content-length": "5" },
    }), "image/png");
    expect(image.headers.get("cache-control")).toBe("private, no-cache, must-revalidate");
    expect(image.headers.get("x-content-type-options")).toBe("nosniff");
    expect(image.headers.get("etag")).toBe("test-etag");
    const notModified = proxyReportImage(new Response(null, { status: 304, headers: { etag: "test-etag" } }), "image/png");
    expect(notModified.status).toBe(304);
    expect(notModified.headers.get("cache-control")).toBe("private, no-cache, must-revalidate");

    const unavailable = reportImageUnavailableResponse();
    expect(unavailable.status).toBe(503);
    expect(unavailable.headers.get("cache-control")).toBe("no-store");
    expect(unavailable.headers.get("retry-after")).toBe("3");
  });
});
