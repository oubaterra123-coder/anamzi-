import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "crypto";

function getEncryptionKey(): Buffer {
  const value = process.env.THREADS_TOKEN_ENCRYPTION_KEY;

  if (!value || !/^[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error("THREADS_TOKEN_ENCRYPTION_KEY must be 32-byte hex");
  }

  return Buffer.from(value, "hex");
}

export function encryptThreadsToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("hex"),
    tag.toString("hex"),
    encrypted.toString("hex"),
  ].join(".");
}

export function verifyMetaSignedRequest(value: string, secret: string) {
  const parts = value.split(".");
  if (parts.length !== 2) return null;

  try {
    const signature = Buffer.from(parts[0], "base64url");
    const payload = Buffer.from(parts[1], "base64url");
    const expected = createHmac("sha256", secret).update(parts[1]).digest();

    if (
      signature.length !== expected.length ||
      !timingSafeEqual(signature, expected)
    ) {
      return null;
    }

    const data = JSON.parse(payload.toString("utf8"));

    if (data.algorithm !== "HMAC-SHA256" || !data.user_id) {
      return null;
    }

    return { userId: String(data.user_id) };
  } catch {
    return null;
  }
}

export function decryptThreadsToken(value: string): string {
  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Invalid encrypted Threads token");
  }

  const [, ivHex, tagHex, encryptedHex] = parts;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivHex, "hex")
  );

  decipher.setAuthTag(Buffer.from(tagHex, "hex"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}