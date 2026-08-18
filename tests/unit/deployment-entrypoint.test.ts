import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("production deployment entrypoint", () => {
  it("blocks web startup until migrations, storage, administrator seed and login verification succeed", () => {
    const entrypoint = readFileSync("deploy/start-production.sh", "utf8");
    const dockerfile = readFileSync("Dockerfile", "utf8");
    const compose = readFileSync("compose.production.yaml", "utf8");
    const example = readFileSync(".env.example", "utf8");

    expect(entrypoint).toContain("set -eu");
    expect(entrypoint).toContain("pnpm prisma migrate deploy");
    expect(entrypoint).toContain("pnpm storage:ensure");
    expect(entrypoint).toContain("pnpm admin:seed");
    expect(entrypoint).toContain("pnpm admin:verify");
    expect(entrypoint.indexOf("pnpm admin:verify")).toBeLessThan(entrypoint.indexOf("exec node server.js"));
    expect(dockerfile).toContain('CMD ["sh", "./deploy/start-production.sh"]');
    expect(compose).toContain("condition: service_healthy");
    expect(example).toContain("ADMIN_SEED_USERNAME");
    expect(example).toContain("replace_with_admin_username");
  });
});
