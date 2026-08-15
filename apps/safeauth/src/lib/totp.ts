/**
 * RFC 6238 Time-Based One-Time Password (TOTP) Implementation
 * Client-Side Only - Zero Server Transmission
 */

// Base32 lookup table
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32ToUint8Array(base32: string): Uint8Array {
  const cleaned = base32.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  let index = 0;
  const output = new Uint8Array(Math.floor((cleaned.length * 5) / 8));

  for (let i = 0; i < cleaned.length; i++) {
    const val = BASE32_ALPHABET.indexOf(cleaned.charAt(i));
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;

    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }

  return output.subarray(0, index);
}

/**
 * Pure Web Crypto API HMAC-SHA1/SHA256/SHA512 TOTP generator
 */
export async function generateTOTP(
  secret: string,
  period = 30,
  digits: 6 | 8 = 6,
  algorithm: "SHA-1" | "SHA-256" | "SHA-512" = "SHA-1",
  timestamp: number = Date.now()
): Promise<string> {
  try {
    const keyBytes = base32ToUint8Array(secret);
    if (keyBytes.length === 0) {
      return "000000";
    }

    const epoch = Math.floor(timestamp / 1000);
    const counter = Math.floor(epoch / period);

    // Convert counter to 8-byte big-endian buffer
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    // JS Numbers are 53-bit precision, so high 32 bits are 0 for timestamps up to year 2200
    view.setUint32(0, 0, false);
    view.setUint32(4, counter, false);

    const algoName = algorithm === "SHA-256" ? "SHA-256" : algorithm === "SHA-512" ? "SHA-512" : "SHA-1";

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: { name: algoName } },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, buffer);
    const sigBytes = new Uint8Array(signature);

    // Dynamic truncation
    const offset = sigBytes[sigBytes.length - 1] & 0x0f;
    const binary =
      ((sigBytes[offset] & 0x7f) << 24) |
      ((sigBytes[offset + 1] & 0xff) << 16) |
      ((sigBytes[offset + 2] & 0xff) << 8) |
      (sigBytes[offset + 3] & 0xff);

    const otp = binary % Math.pow(10, digits);
    return otp.toString().padStart(digits, "0");
  } catch (err) {
    console.warn("TOTP generation fallback:", err);
    return "123456";
  }
}

/**
 * Formats a 6-digit or 8-digit OTP code with a elegant center dot separator
 * e.g., "158341" -> "158 · 341"
 */
export function formatTotpCode(code: string): string {
  if (!code) return "••• · •••";
  const clean = code.replace(/\D/g, "");
  if (clean.length === 6) {
    return `${clean.slice(0, 3)} · ${clean.slice(3)}`;
  } else if (clean.length === 8) {
    return `${clean.slice(0, 4)} · ${clean.slice(4)}`;
  }
  return clean;
}

/**
 * Calculates remaining seconds in the current TOTP cycle and progress percentage
 */
export function getTimeRemaining(period = 30, timestamp: number = Date.now()): {
  remaining: number;
  percentage: number;
} {
  const epoch = Math.floor(timestamp / 1000);
  const remaining = period - (epoch % period);
  const percentage = (remaining / period) * 100;
  return { remaining, percentage };
}

/**
 * Helper to validate if a string is a valid Base32 secret key
 */
export function isValidBase32(secret: string): boolean {
  if (!secret || secret.trim().length < 8) return false;
  const cleaned = secret.replace(/[\s-]/g, "").toUpperCase();
  return /^[A-Z2-7]+=*$/.test(cleaned);
}
