vi.mock("@/server/services/public-content-service", () => ({
  PublicContentService: class {
    getContent() {
      return Promise.reject(new Error("database unavailable"));
    }
  },
}));

import { GET } from "@/app/api/public/content/route";

describe("public content API recovery", () => {
  it("returns a retryable 503 instead of hanging or exposing an internal error", async () => {
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("retry-after")).toBe("3");
    await expect(response.json()).resolves.toEqual({ error: "PUBLIC_CONTENT_UNAVAILABLE" });
  });
});
