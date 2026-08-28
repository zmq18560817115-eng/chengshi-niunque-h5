import { getObjectStorage } from "../src/server/storage";

async function main() {
  const storage = getObjectStorage();
  const bucket = await storage.ensureBucket();
  await storage.checkConnection();
  console.log(JSON.stringify({ bucket, objects: 0, connection: "ok" }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Storage bootstrap failed");
  process.exitCode = 1;
});
