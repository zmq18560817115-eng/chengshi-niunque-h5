export type StoredObject = { key: string; contentType: string; size: number; etag?: string };
export interface ObjectStorage {
  put(key: string, body: Uint8Array, contentType: string): Promise<StoredObject>;
  remove(key: string): Promise<void>;
  createReadUrl(key: string, expiresInSeconds: number): Promise<string>;
}
