import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
const params = { N: 16384, r: 8, p: 1, keyLength: 64 } as const;

function derive(password: string, salt: Buffer, keyLength: number, options: { N: number; r: number; p: number; maxmem: number }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, key) => error ? reject(error) : resolve(key));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await derive(password, salt, params.keyLength, {
    N: params.N,
    r: params.r,
    p: params.p,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$v1$N=${params.N},r=${params.r},p=${params.p},keyLength=${params.keyLength}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split("$");
  if (parts.length !== 5 || parts[0] !== "scrypt" || parts[1] !== "v1") {
    timingSafeEqual(Buffer.alloc(params.keyLength), Buffer.alloc(params.keyLength));
    return false;
  }
  const parsed = Object.fromEntries(parts[2].split(",").map((item) => item.split("=")));
  const N = Number(parsed.N);
  const r = Number(parsed.r);
  const p = Number(parsed.p);
  const keyLength = Number(parsed.keyLength);
  if (![N, r, p, keyLength].every(Number.isSafeInteger) || keyLength < 32 || keyLength > 128) return false;
  try {
    const salt = Buffer.from(parts[3], "base64url");
    const expected = Buffer.from(parts[4], "base64url");
    const actual = await derive(password, salt, keyLength, { N, r, p, maxmem: 64 * 1024 * 1024 });
    if (actual.length !== expected.length) {
      timingSafeEqual(actual, Buffer.alloc(actual.length));
      return false;
    }
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
