import type { PcqParameters } from '../../../../main/services/pcq/PcqParameters.interface';
import { createToken } from '../../../../main/services/pcq/createToken';

describe('createToken', () => {
  const sampleParams: PcqParameters = {
    serviceId: 'PCS',
    actor: 'APPLICANT',
    pcqId: 'abc-123',
    partyId: 'user%40email.com',
    returnUrl: 'http://localhost:3000/respond-to-claim/free-legal-advice',
    language: 'en',
    ccdCaseId: '1234567890',
  };

  const tokenKey = 'test-secret-key';

  it('should return a non-empty encrypted string', () => {
    const token = createToken(sampleParams, tokenKey);

    expect(typeof token).toBe('string');
    expect(token).not.toHaveLength(0);
  });

  it('should produce consistent token for same input and key', () => {
    const token1 = createToken(sampleParams, tokenKey);
    const token2 = createToken(sampleParams, tokenKey);

    expect(token1).toBe(token2);
  });

  it('should produce different token for different keys', () => {
    const token1 = createToken(sampleParams, tokenKey);
    const token2 = createToken(sampleParams, 'different-key');

    expect(token1).not.toBe(token2);
  });
});
