import { AdminAuthRepository } from "@/server/repositories/admin-auth-repository";
import { verifyPassword } from "@/server/auth/password";
import { createSessionToken, digestSessionToken, privacyHash, SESSION_MAX_AGE_SECONDS } from "@/server/auth/token";

const dummyHash = "scrypt$v1$N=16384,r=8,p=1,keyLength=64$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export class AdminAuthService {
  constructor(private readonly repository = new AdminAuthRepository()) {}

  async login(accountInput: string, password: string, ipAddress?: string) {
    const account = accountInput.trim().toLowerCase();
    const identifierHash = privacyHash(account);
    const ipHash = ipAddress ? privacyHash(ipAddress) : null;
    const admin = await this.repository.findAdminByEmail(account);
    const passwordValid = await verifyPassword(password, admin?.passwordHash ?? dummyHash);
    const failures = await this.repository.countRecentFailures(identifierHash, ipHash, new Date(Date.now() - 15 * 60 * 1000));
    const allowed = failures.identifier < 5 && failures.ip < 25;
    const validAdmin = admin?.status === "ACTIVE" && admin.deletedAt === null;
    const success = Boolean(passwordValid && allowed && validAdmin);
    await this.repository.recordAttempt({ adminId: admin?.id, identifierHash, ipHash: ipHash ?? undefined, success });
    if (!success || !admin) return null;
    await this.repository.clearFailures(identifierHash);

    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
    await this.repository.createSession({ adminId: admin.id, tokenDigest: digestSessionToken(token), expiresAt });
    return { token, expiresAt, admin: { id: admin.id, email: admin.email, displayName: admin.displayName } };
  }

  async authenticateToken(token?: string) {
    if (!token) return null;
    const session = await this.repository.findActiveSession(digestSessionToken(token), new Date());
    if (!session) return null;
    return { id: session.admin.id, email: session.admin.email, displayName: session.admin.displayName, sessionId: session.id };
  }

  async logout(token?: string): Promise<void> {
    if (token) await this.repository.revokeSession(digestSessionToken(token), new Date());
  }
}
