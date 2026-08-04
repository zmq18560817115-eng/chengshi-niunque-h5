import { AdminAuthService } from "@/server/services/admin-auth-service";
import { getAdminSeedConfig } from "@/server/env";
import { prisma } from "@/server/db/prisma";
import { privacyHash } from "@/server/auth/token";

describe("admin authentication", () => {
  const sessionIds: string[] = [];
  afterAll(async () => {
    await prisma.adminSession.deleteMany({ where: { id: { in: sessionIds } } });
    await prisma.adminLoginAttempt.deleteMany({ where: { ipHash: privacyHash("test-auth-ip") } });
  });
  it("accepts the correct password, rejects a wrong password, and revokes logout immediately", async () => {
    const config = getAdminSeedConfig();
    const service = new AdminAuthService();
    await expect(service.login(config.email, `${config.password}-wrong`, "test-auth-ip")).resolves.toBeNull();
    const login = await service.login(config.email, config.password, "test-auth-ip");
    if (login) sessionIds.push((await service.authenticateToken(login.token))!.sessionId);
    expect(login?.token).toBeTruthy();
    await expect(service.authenticateToken(login?.token)).resolves.toMatchObject({ email: config.email });
    await service.logout(login?.token);
    await expect(service.authenticateToken(login?.token)).resolves.toBeNull();
  });
});
