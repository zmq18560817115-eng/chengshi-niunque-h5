import { prisma } from "@/server/db/prisma";
import { getObjectStorage } from "@/server/storage";

type CheckStatus = "ok" | "error";

async function checkDatabase(): Promise<CheckStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "ok";
  } catch {
    return "error";
  }
}

async function checkObjectStorage(): Promise<CheckStatus> {
  try {
    await getObjectStorage().checkConnection();
    return "ok";
  } catch {
    return "error";
  }
}

export async function getHealthStatus() {
  const [database, objectStorage] = await Promise.all([
    checkDatabase(),
    checkObjectStorage(),
  ]);
  const healthy = database === "ok" && objectStorage === "ok";

  return {
    healthy,
    body: {
      status: healthy ? "ok" : "degraded",
      service: "honest-nutri-report-h5",
      checks: { database, objectStorage },
    },
  };
}
