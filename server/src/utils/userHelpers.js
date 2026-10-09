import pool from "../config/db.js";
import crypto from "crypto";

const SPACE_REGEX = /\s+/g;
const INVALID_CHAR_REGEX = /[^a-z0-9_]/g;
const TRIM_UNDERSCORE_REGEX = /^_+|_+$/g;

/**
 * Generate a unique username based on an email and/or full name.
 * Checks the database for collisions and appends a counter suffix if needed.
 */
export async function generateUniqueUsername(email, name) {
  let base = name
    ? name
        .toLowerCase()
        .replace(SPACE_REGEX, "_")
        .replace(INVALID_CHAR_REGEX, "")
    : email.split("@")[0];
  base = base.replace(TRIM_UNDERSCORE_REGEX, "") || email.split("@")[0];

  let username = base;
  let counter = 1;
  while (true) {
    const { rows } = await pool.query(
      "SELECT id FROM tbl_appusers WHERE username=$1",
      [username],
    );
    if (rows.length === 0) break;
    username = `${base}_${counter++}`;
  }
  return username;
}

/**
 * Generate a cryptographically secure temporary password.
 * Contains at least 1 uppercase, 1 lowercase, 1 digit, 1 special character.
 * Total length: 12 characters.
 */
export function generateTemporaryPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%^&*";
  const all = `${upper}${lower}${digits}${special}`;
  const chars = [upper, lower, digits, special].map(
    (set) => set[crypto.randomInt(set.length)],
  );
  while (chars.length < 12) chars.push(all[crypto.randomInt(all.length)]);
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(index + 1);
    [chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
  }
  return chars.join("");
}
