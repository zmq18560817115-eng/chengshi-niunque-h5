import { prisma } from "@/server/db/prisma";
import { getHealthCheckTimeoutMs } from "@/server/env";
import { getObjectStorage } from "@/server/storage";
import { withTimeout } from "@/server/utils/with-timeout";

type CheckStatus = "ok" | "error";

async function checkDatabase(): Promise<CheckStatus> {
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, getHealthCheckTimeoutMs(), "Database health check");
    return "ok";
  } catch {
    return "error";
  }
}

async function checkObjectStorage(): Promise<CheckStatus> {
  try {
    await withTimeout(getObjectStorage().checkConnection(), getHealthCheckTimeoutMs(), "Object storage health check");
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
