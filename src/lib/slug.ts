import { customAlphabet } from "nanoid";

// URL-safe alphabet, no ambiguous chars (0/O/1/l/I)
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
const nanoid = customAlphabet(ALPHABET, 7);

export function generateSlug(length = 7): string {
  return customAlphabet(ALPHABET, length)();
}

export function defaultSlug(): string {
  return nanoid();
}

export const SLUG_REGEX = /^[a-zA-Z0-9_-]{3,64}$/;

export function isValidSlug(s: string): boolean {
  return SLUG_REGEX.test(s);
}
