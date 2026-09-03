import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageConfig } from "@/server/env";
import type { ObjectStorage, ReadObjectOptions, StoredObject } from "./object-storage";

type S3Error = Error & { $metadata?: { httpStatusCode?: number } };

export class S3ObjectStorage implements ObjectStorage {
  private readonly client: S3Client;

  constructor(private readonly config: StorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      maxAttempts: config.maxAttempts,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async put(key: string, body: Uint8Array, contentType: string): Promise<StoredObject> {
    const response = await this.client.send(
      new PutObjectCommand({ Bucket: this.config.bucket, Key: key, Body: body, ContentType: contentType }),
      { abortSignal: AbortSignal.timeout(this.config.requestTimeoutMs) },
    );
    return { key, contentType, size: body.byteLength, etag: response.ETag };
  }

  async remove(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }),
      { abortSignal: AbortSignal.timeout(this.config.requestTimeoutMs) },
    );
  }

  createReadUrl(key: string, expiresInSeconds: number): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  async read(key: string, options: ReadObjectOptions = {}): Promise<Response> {
    const url = await this.createReadUrl(key, options.expiresInSeconds ?? 60);
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt += 1) {
      try {
        const headers = new Headers();
        if (options.range) headers.set("Range", options.range);
        if (options.ifNoneMatch) headers.set("If-None-Match", options.ifNoneMatch);
        if (options.ifModifiedSince) headers.set("If-Modified-Since", options.ifModifiedSince);
        const response = await fetch(url, {
          headers,
          signal: AbortSignal.timeout(this.config.requestTimeoutMs),
        });
        if (response.status < 500 || attempt === this.config.maxAttempts) return response;
        await response.body?.cancel().catch(() => undefined);
      } catch (error) {
        lastError = error;
        if (attempt === this.config.maxAttempts) throw error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Object storage read failed");
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }),
        { abortSignal: AbortSignal.timeout(this.config.requestTimeoutMs) },
      );
      return true;
    } catch (error) {
      if ((error as S3Error).$metadata?.httpStatusCode === 404) return false;
      throw error;
    }
  }

  async checkConnection(): Promise<void> {
    await this.client.send(
      new HeadBucketCommand({ Bucket: this.config.bucket }),
      { abortSignal: AbortSignal.timeout(this.config.requestTimeoutMs) },
    );
  }

  async ensureBucket(): Promise<"created" | "exists"> {
    try {
      await this.checkConnection();
      return "exists";
    } catch (error) {
      if ((error as S3Error).$metadata?.httpStatusCode !== 404) {
        throw error;
      }
      await this.client.send(
        new CreateBucketCommand({ Bucket: this.config.bucket }),
        { abortSignal: AbortSignal.timeout(this.config.requestTimeoutMs) },
      );
      return "created";
    }
  }
}
