import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY must be set in production (min 32 chars)");
    }
    return Buffer.alloc(32, "dev-insecure-key-do-not-use-prod");
  }
  return Buffer.from(key.slice(0, 32), "utf8");
}

/**
 * AES-256-GCM encryption for GDPR special-category fields
 * (personnummer, bank account numbers). Output format: iv:tag:ciphertext (hex).
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext) return "";
  const [ivHex, tagHex, dataHex] = ciphertext.split(":");
  if (!ivHex || !tagHex || !dataHex) return ciphertext; // not encrypted (legacy row)
  try {
    const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return decipher.update(Buffer.from(dataHex, "hex")) + decipher.final("utf8");
  } catch {
    // Value was not produced by encrypt() (legacy plaintext that happens to
    // contain colons) or the key changed — return it untouched rather than throw.
    return ciphertext;
  }
}
