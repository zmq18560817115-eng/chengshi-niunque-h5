export type StorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
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
  };
}
