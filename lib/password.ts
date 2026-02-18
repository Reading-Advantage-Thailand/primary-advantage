import { scryptAsync } from "@noble/hashes/scrypt.js";
import { compare as bcryptCompare } from "bcryptjs";

/**
 * Scrypt configuration matching better-auth defaults.
 * @see node_modules/better-auth/dist/crypto/password.mjs
 */
const SCRYPT_CONFIG = {
  N: 16384,
  r: 16,
  p: 1,
  dkLen: 64,
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Hash a password using scrypt (better-auth standard).
 * Output format: `<hex_salt>:<hex_key>`
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  const key = await scryptAsync(password.normalize("NFKC"), salt, {
    N: SCRYPT_CONFIG.N,
    r: SCRYPT_CONFIG.r,
    p: SCRYPT_CONFIG.p,
    dkLen: SCRYPT_CONFIG.dkLen,
    maxmem: 128 * SCRYPT_CONFIG.N * SCRYPT_CONFIG.r * 2,
  });
  return `${salt}:${bytesToHex(key)}`;
}

/**
 * Constant-time comparison of two Uint8Arrays.
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

/**
 * Check if a hash string is a bcrypt hash.
 */
export function isBcryptHash(hash: string): boolean {
  return (
    hash.startsWith("$2a$") ||
    hash.startsWith("$2b$") ||
    hash.startsWith("$2y$")
  );
}

/**
 * Verify a password against a hash.
 * Supports both bcrypt (legacy) and scrypt (better-auth standard).
 */
export async function verifyPassword({
  hash,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> {
  if (isBcryptHash(hash)) {
    return bcryptCompare(password, hash);
  }

  // scrypt format: "hex_salt:hex_key"
  const [salt, key] = hash.split(":");
  if (!salt || !key) return false;

  const derivedKey = await scryptAsync(password.normalize("NFKC"), salt, {
    N: SCRYPT_CONFIG.N,
    r: SCRYPT_CONFIG.r,
    p: SCRYPT_CONFIG.p,
    dkLen: SCRYPT_CONFIG.dkLen,
    maxmem: 128 * SCRYPT_CONFIG.N * SCRYPT_CONFIG.r * 2,
  });

  return constantTimeEqual(derivedKey, hexToBytes(key));
}
