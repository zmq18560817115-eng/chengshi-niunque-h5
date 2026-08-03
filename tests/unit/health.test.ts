import { GET } from "@/app/api/health/route";

describe("health endpoint", () => {
  it("reports real database and object storage checks", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      checks: { database: "ok", objectStorage: "ok" },
    });
  });
});
