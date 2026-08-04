import { prisma } from "@/server/db/prisma";

export class AdminAuthRepository {
  findAdminByEmail(email: string) {
    return prisma.adminUser.findUnique({ where: { email } });
  }

  upsertAdmin(input: { email: string; displayName: string; passwordHash: string }) {
    return prisma.adminUser.upsert({
      where: { email: input.email },
      update: { displayName: input.displayName, passwordHash: input.passwordHash, status: "ACTIVE", deletedAt: null },
      create: { ...input, status: "ACTIVE" },
    });
  }

  createSession(input: { adminId: string; tokenDigest: string; expiresAt: Date }) {
    return prisma.adminSession.create({ data: input });
  }

  findActiveSession(tokenDigest: string, now: Date) {
    return prisma.adminSession.findFirst({
      where: { tokenDigest, revokedAt: null, expiresAt: { gt: now }, admin: { status: "ACTIVE", deletedAt: null } },
      include: { admin: true },
    });
  }

  revokeSession(tokenDigest: string, now: Date) {
    return prisma.adminSession.updateMany({ where: { tokenDigest, revokedAt: null }, data: { revokedAt: now } });
  }

  countRecentFailures(identifierHash: string, ipHash: string | null, since: Date) {
    return prisma.adminLoginAttempt.count({
      where: {
        success: false,
        createdAt: { gte: since },
        OR: [{ identifierHash }, ...(ipHash ? [{ ipHash }] : [])],
      },
    });
  }

  recordAttempt(input: { adminId?: string; identifierHash: string; ipHash?: string; success: boolean }) {
    return prisma.adminLoginAttempt.create({ data: input });
  }

  clearFailures(identifierHash: string) {
    return prisma.adminLoginAttempt.deleteMany({ where: { identifierHash, success: false } });
  }
}
