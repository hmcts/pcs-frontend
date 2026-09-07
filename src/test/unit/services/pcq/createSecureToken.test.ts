import crypto from 'crypto';

import type { PcqParameters } from '@services/pcq/PcqParameters.interface';
import { createSecureToken } from '@services/pcq/createSecureToken';

const sampleParams: PcqParameters = {
  serviceId: 'PCS',
  actor: 'RESPONDENT',
  pcqId: 'abc-123',
  partyId: 'user@email.com',
  returnUrl: 'http://localhost:3000/case/123456789/respond-to-claim/language-used?nav=1',
  language: 'en',
  ccdCaseId: '1234567890',
};

const tokenKey = 'test-secret-key';

/**
 * Faithful mirror of `verifySecureToken` in pcq-frontend (app/components/encryption-token.js).
 * If this stops passing, PCQ will reject our invocation.
 */
const verifyAsPcqWould = (
  received: { token: string; authTag: string; iv: string; salt: string },
  key: string
): Record<string, string> => {
  const derivedKey = crypto.scryptSync(key, Buffer.from(received.salt, 'base64'), 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, Buffer.from(received.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(received.authTag, 'base64'));

  let decrypted = decipher.update(received.token, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted);
};

describe('createSecureToken', () => {
  it('produces a token PCQ can decrypt back to the original params', () => {
    const secureToken = createSecureToken(sampleParams, tokenKey);

    expect(verifyAsPcqWould(secureToken, tokenKey)).toEqual(sampleParams);
  });

  it('emits an auth tag of the length PCQ requires', () => {
    const { authTag } = createSecureToken(sampleParams, tokenKey);

    // verifySecureToken hard-rejects anything that is not exactly 16 bytes.
    expect(Buffer.from(authTag, 'base64')).toHaveLength(16);
  });

  it('uses a fresh salt and IV on every call', () => {
    const first = createSecureToken(sampleParams, tokenKey);
    const second = createSecureToken(sampleParams, tokenKey);

    // The legacy scheme was deterministic (fixed IV, fixed salt); the secure one must not be.
    expect(first.salt).not.toBe(second.salt);
    expect(first.iv).not.toBe(second.iv);
    expect(first.token).not.toBe(second.token);
  });

  it('survives the full query-string round trip PCQ actually receives', () => {
    const secureToken = createSecureToken(sampleParams, tokenKey);

    // Serialise exactly as startPcq does, then parse it back the way Express would. Base64 contains
    // '+', '/' and '=', so this is where any encoding mistake would surface.
    const queryString = new URLSearchParams({ ...sampleParams, ...secureToken }).toString();
    const received = Object.fromEntries(new URLSearchParams(queryString));

    const { token, authTag, iv, salt, ...params } = received;

    // PCQ routes on the presence of all three before it will decrypt at all.
    expect(Boolean(authTag && iv && salt)).toBe(true);

    const decrypted = verifyAsPcqWould({ token, authTag, iv, salt }, tokenKey);

    // Mirrors PCQ's sameParams: identical key sets, identical stringified values.
    expect(Object.keys(decrypted).sort()).toEqual(Object.keys(params).sort());
    expect(decrypted).toEqual(params);
  });

  it('cannot be decrypted with the wrong shared key', () => {
    const secureToken = createSecureToken(sampleParams, tokenKey);

    expect(() => verifyAsPcqWould(secureToken, 'not-the-shared-key')).toThrow();
  });

  it('fails authentication if the ciphertext is tampered with', () => {
    const secureToken = createSecureToken(sampleParams, tokenKey);
    const raw = Buffer.from(secureToken.token, 'base64');
    raw[0] ^= 0xff;

    expect(() => verifyAsPcqWould({ ...secureToken, token: raw.toString('base64') }, tokenKey)).toThrow();
  });
});
