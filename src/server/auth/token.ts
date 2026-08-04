import { createHmac, randomBytes } from "node:crypto";
import { getSessionSecret } from "@/server/env";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function digestSessionToken(token: string): string {
  return createHmac("sha256", getSessionSecret()).update(token).digest("base64url");
}

export function privacyHash(value: string): string {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}
