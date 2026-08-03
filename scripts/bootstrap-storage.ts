import { getObjectStorage } from "../src/server/storage";

const pdfSample = new TextEncoder().encode(
  "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);
const imageSample = new TextEncoder().encode(
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#f5f1e8"/><text x="320" y="180" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#2f3b2f">本地复核流程资料</text></svg>',
);

async function main() {
  const storage = getObjectStorage();
  const bucket = await storage.ensureBucket();
  await storage.put("seed/reports/nutrition-report.pdf", pdfSample, "application/pdf");
  await storage.put("seed/images/review-process.svg", imageSample, "image/svg+xml");
  await storage.checkConnection();
  console.log(JSON.stringify({ bucket, objects: 2, connection: "ok" }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Storage bootstrap failed");
  process.exitCode = 1;
});
