export type StorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  requestTimeoutMs: number;
  maxAttempts: number;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalInteger(name: string, fallback: number, minimum: number, maximum: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

export function getDatabaseUrl(): string {
  return required("DATABASE_URL");
}

export function getStorageConfig(): StorageConfig {
  const forcePathStyle = required("S3_FORCE_PATH_STYLE");
  if (forcePathStyle !== "true" && forcePathStyle !== "false") {
    throw new Error("S3_FORCE_PATH_STYLE must be true or false");
  }

  return {
    endpoint: required("S3_ENDPOINT"),
    region: required("S3_REGION"),
    bucket: required("S3_BUCKET"),
    accessKeyId: required("S3_ACCESS_KEY_ID"),
    secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
    forcePathStyle: forcePathStyle === "true",
    requestTimeoutMs: optionalInteger("S3_REQUEST_TIMEOUT_MS", 3_000, 1_000, 30_000),
    maxAttempts: optionalInteger("S3_MAX_ATTEMPTS", 2, 1, 3),
  };
}

export function getHealthCheckTimeoutMs(): number {
  return optionalInteger("HEALTH_CHECK_TIMEOUT_MS", 3_000, 500, 15_000);
}

export function getPublicDataTimeoutMs(): number {
  return optionalInteger("PUBLIC_DATA_TIMEOUT_MS", 5_000, 500, 20_000);
}

export function getSessionSecret(): string {
  const secret = required("SESSION_SECRET");
  if (secret.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");
  return secret;
}

export function getAdminSeedConfig() {
  const configuredUsername = process.env.ADMIN_SEED_USERNAME?.trim();
  return {
    // AdminUser.email is retained as the legacy database identifier column,
    // while deployments now configure and present this value as a username.
    email: (configuredUsername || required("ADMIN_SEED_EMAIL")).toLowerCase(),
    displayName: required("ADMIN_SEED_DISPLAY_NAME"),
    password: required("ADMIN_SEED_PASSWORD"),
  };
}
