import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn(), back: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (!match || process.env[match[1]]) continue;
  const value = match[2].trim();
  process.env[match[1]] = value.replace(/^(["'])(.*)\1$/, "$2");
}
