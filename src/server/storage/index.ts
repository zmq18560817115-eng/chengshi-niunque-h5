import { getStorageConfig } from "@/server/env";
import { S3ObjectStorage } from "./s3-object-storage";

let storage: S3ObjectStorage | undefined;

export function getObjectStorage(): S3ObjectStorage {
  storage ??= new S3ObjectStorage(getStorageConfig());
  return storage;
}
