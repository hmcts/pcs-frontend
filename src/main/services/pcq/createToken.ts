import crypto from 'crypto';

import type { PcqParameters } from './PcqParameters.interface';

const algorithm = 'aes-256-gcm';
const bufferSize = 16;
const iv = Buffer.alloc(bufferSize, 0); // Initialization vector
const keyLen = 32;

export const createToken = (params: PcqParameters, tokenKey: string): string => {
  const key = crypto.scryptSync(tokenKey, 'salt', keyLen);

  // Ensure all values are stringified
  const sanitizedParams = Object.fromEntries(
    Object.entries(params).map(([paramKey, value]) => [paramKey, String(value)])
  );
  const plaintext = JSON.stringify(sanitizedParams);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return encrypted;
};
