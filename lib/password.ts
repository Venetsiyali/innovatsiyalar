import "server-only";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";

export const BCRYPT_ROUNDS = 12;

// No look-alike characters (0/O, 1/l/I) so passwords can be dictated or printed.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateTempPassword(length = 10): string {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}
