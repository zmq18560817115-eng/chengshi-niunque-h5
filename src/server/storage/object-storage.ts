export type StoredObject = { key: string; contentType: string; size: number; etag?: string };
export type ReadObjectOptions = { expiresInSeconds?: number; range?: string; ifNoneMatch?: string; ifModifiedSince?: string };
export interface ObjectStorage {
  put(key: string, body: Uint8Array, contentType: string): Promise<StoredObject>;
  remove(key: string): Promise<void>;
  createReadUrl(key: string, expiresInSeconds: number): Promise<string>;
  read(key: string, options?: ReadObjectOptions): Promise<Response>;
  exists(key: string): Promise<boolean>;
  checkConnection(): Promise<void>;
  ensureBucket(): Promise<"created" | "exists">;
}
