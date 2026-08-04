import { hashPassword } from "../src/server/auth/password";
import { getAdminSeedConfig } from "../src/server/env";
import { AdminAuthRepository } from "../src/server/repositories/admin-auth-repository";
import { prisma } from "../src/server/db/prisma";

async function main() {
  const config = getAdminSeedConfig();
  const passwordHash = await hashPassword(config.password);
  const admin = await new AdminAuthRepository().upsertAdmin({
    email: config.email,
    displayName: config.displayName,
    passwordHash,
  });
  console.log(JSON.stringify({ status: "ready", email: admin.email, updated: true }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Admin seed failed");
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
