import { getObjectStorage } from "../src/server/storage";

async function main() {
  const storage = getObjectStorage();
  const bucket = await storage.ensureBucket();
  await storage.checkConnection();
  console.log(JSON.stringify({ status: "ready", bucket, connection: "ok" }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Storage readiness check failed");
  process.exitCode = 1;
});
