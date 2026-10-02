import crypto from 'crypto';

import type { PcqParameters } from './PcqParameters.interface';

// PCQ's secure token scheme. Every constant here is dictated by `verifySecureToken` in
// pcq-frontend (app/components/encryption-token.js) — that code is authoritative where the PCQ
// onboarding docs disagree with it. The scrypt cost parameters are Node's defaults
// (N=16384, r=8, p=1), which is what PCQ's own `scryptSync(tokenKey, saltBuffer, 32)` uses.
const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH_BYTES = 16;
const IV_LENGTH_BYTES = 12;
const KEY_LENGTH_BYTES = 32;

export interface PcqSecureToken {
  token: string;
  authTag: string;
  iv: string;
  salt: string;
}

/**
 * Encrypts the PCQ invocation params into a token PCQ can verify.
 *
 * All four returned fields travel on the query string, and the field names matter: PCQ only takes
 * the secure verification path when `authTag`, `iv` and `salt` are all present. Omit or misname any
 * one of them and it silently falls back to the legacy fixed-IV scheme, which can never match a
 * token built here. (The PCQ docs call the IV `randomIv` — that is their internal variable name,
 * not the query parameter.)
 *
 * Everything is base64, including the ciphertext. The docs describe a hex token; PCQ's verifier
 * decodes base64.
 */
export const createSecureToken = (params: PcqParameters, tokenKey: string): PcqSecureToken => {
  const salt = crypto.randomBytes(SALT_LENGTH_BYTES);
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const key = crypto.scryptSync(tokenKey, salt, KEY_LENGTH_BYTES);

  // PCQ compares the decrypted params against the query string it received, where every value is a
  // string, so stringify before encrypting.
  const sanitizedParams = Object.fromEntries(
    Object.entries(params).map(([paramKey, value]) => [paramKey, String(value)])
  );

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let token = cipher.update(JSON.stringify(sanitizedParams), 'utf8', 'base64');
  token += cipher.final('base64');

  return {
    token,
    authTag: cipher.getAuthTag().toString('base64'),
    iv: iv.toString('base64'),
    salt: salt.toString('base64'),
  };
};
