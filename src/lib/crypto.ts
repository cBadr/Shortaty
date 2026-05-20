/**
 * AES-256-GCM encryption for at-rest secrets (Telegram bot tokens, etc.)
 * Works in both Node.js and Edge runtime via Web Crypto API.
 *
 * Format: <iv(12)>:<ciphertext+tag> base64
 */

function getKeyBytes(): Uint8Array {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function getKey(): Promise<CryptoKey> {
  const bytes = getKeyBytes();
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  return crypto.subtle.importKey(
    "raw",
    buf,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

function toBuffer(bytes: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  return buf;
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const arr = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) arr[i] = s.charCodeAt(i);
  return arr;
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toBuffer(iv) },
    key,
    new TextEncoder().encode(plaintext)
  );
  return `${toBase64(iv)}:${toBase64(new Uint8Array(ciphertext))}`;
}

export async function decryptSecret(payload: string): Promise<string> {
  const [ivB64, ctB64] = payload.split(":");
  if (!ivB64 || !ctB64) throw new Error("Invalid encrypted payload");
  const key = await getKey();
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toBuffer(fromBase64(ivB64)) },
    key,
    toBuffer(fromBase64(ctB64))
  );
  return new TextDecoder().decode(plaintext);
}

/**
 * Stable hash for use in URL paths (e.g. webhook path) — NOT for security.
 */
export async function shortHash(input: string, len = 24): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, len);
}
