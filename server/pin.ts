import crypto from "crypto";
import bcrypt from "bcryptjs";

// ─── Configuration ──────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 10;

function getEncryptionKey(): Buffer {
  const hex = process.env.PIN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "PIN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

function getHmacSecret(): string {
  const secret = process.env.DEAL_HMAC_SECRET;
  if (!secret) {
    throw new Error("DEAL_HMAC_SECRET env var is required.");
  }
  return secret;
}

// ─── AES-256-GCM Encrypt / Decrypt ─────────────────────────────────────────

/**
 * Encrypts a plaintext PIN using AES-256-GCM.
 * Returns a compact string: base64(iv + authTag + ciphertext)
 */
function encryptPin(plain: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag(); // 16 bytes
  // Pack: iv(12) + tag(16) + ciphertext(variable)
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/**
 * Decrypts an AES-256-GCM encrypted PIN.
 */
export function decryptPin(packed: string): string {
  const key = getEncryptionKey();
  const buf = Buffer.from(packed, "base64");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}

// ─── PIN Generation ─────────────────────────────────────────────────────────

/**
 * Generates a 6-digit PIN, bcrypt-hashes it, and AES-encrypts it.
 * Returns all three representations.
 */
export async function generatePin(): Promise<{
  plain: string;
  hash: string;
  encrypted: string;
}> {
  const plain = crypto.randomInt(100000, 999999).toString();
  const hash = await bcrypt.hash(plain, BCRYPT_ROUNDS);
  const encrypted = encryptPin(plain);
  return { plain, hash, encrypted };
}

// ─── PIN Verification ───────────────────────────────────────────────────────

/**
 * Timing-safe comparison of a plaintext PIN against a bcrypt hash.
 */
export async function verifyPin(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── UPI Transaction Note Tag ───────────────────────────────────────────────

/**
 * Generates a deterministic deal tag for UPI transaction notes.
 * Format: BBX-{dealId}-{6-char HMAC fragment}
 */
export function generateDealTag(dealId: number): string {
  const hmac = crypto
    .createHmac("sha256", getHmacSecret())
    .update(String(dealId))
    .digest("hex");
  const fragment = hmac.substring(0, 6);
  return `BBX-${dealId}-${fragment}`;
}
