import { access, cp, mkdir } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const standaloneRoot = path.join(projectRoot, ".next", "standalone");
const standaloneServer = path.join(standaloneRoot, "server.js");

try {
  await access(standaloneServer);
} catch {
  console.log("Standalone asset staging skipped: .next/standalone/server.js was not generated.");
  process.exit(0);
}

const standalonePublic = path.join(standaloneRoot, "public");
const standaloneStatic = path.join(standaloneRoot, ".next", "static");

await mkdir(standalonePublic, { recursive: true });
await mkdir(standaloneStatic, { recursive: true });
await cp(path.join(projectRoot, "public"), standalonePublic, {
  recursive: true,
  force: true,
});
await cp(path.join(projectRoot, ".next", "static"), standaloneStatic, {
  recursive: true,
  force: true,
});

await access(path.join(standalonePublic, "design", "guide", "guide-first-frame.webp"));
await access(path.join(standalonePublic, "design", "final-v1", "archive-reference.webp"));

console.log("Standalone build includes public assets and Next static files.");
