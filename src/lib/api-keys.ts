import { customAlphabet } from "nanoid";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const randomPart = customAlphabet(ALPHABET, 40);

const PREFIX_LIVE = "sk_live_";
const PREFIX_TEST = "sk_test_";

export interface GeneratedKey {
  plaintext: string;   // shown to user once
  hash: string;        // stored in DB
  prefix: string;      // public prefix for display in UI ("sk_live_abc...")
}

export async function generateApiKey(env: "live" | "test" = "live"): Promise<GeneratedKey> {
  const prefix = env === "live" ? PREFIX_LIVE : PREFIX_TEST;
  const body = randomPart();
  const plaintext = `${prefix}${body}`;
  const hash = await hashKey(plaintext);
  const displayPrefix = plaintext.slice(0, prefix.length + 6) + "…" + plaintext.slice(-4);
  return { plaintext, hash, prefix: displayPrefix };
}

export async function hashKey(plaintext: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(plaintext));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function extractBearer(header: string | null): string | null {
  if (!header) return null;
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}
