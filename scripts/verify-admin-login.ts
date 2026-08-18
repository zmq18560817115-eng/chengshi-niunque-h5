import { getAdminSeedConfig } from "../src/server/env";
import { prisma } from "../src/server/db/prisma";
import { AdminAuthService } from "../src/server/services/admin-auth-service";

async function main() {
  const config = getAdminSeedConfig();
  const service = new AdminAuthService();
  const login = await service.login(config.email, config.password);
  if (!login) throw new Error("Configured administrator cannot log in");
  const authenticated = await service.authenticateToken(login.token);
  await service.logout(login.token);
  if (!authenticated || authenticated.id !== login.admin.id) {
    throw new Error("Configured administrator session verification failed");
  }
  console.log(JSON.stringify({ status: "ready", account: login.admin.email, login: "ok" }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Administrator login verification failed");
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
