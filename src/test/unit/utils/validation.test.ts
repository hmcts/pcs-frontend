import { sanitizeCaseReference, validateCaseReference } from '../../../main/utils/validation';

describe('validation utilities', () => {
  describe('validateCaseReference', () => {
    it('should accept valid 16-digit case reference', () => {
      expect(validateCaseReference('1761061165632943')).toBe(true);
      expect(validateCaseReference('1234567890123456')).toBe(true);
      expect(validateCaseReference('0000000000000000')).toBe(true);
    });

    it('should reject case reference with wrong length', () => {
      expect(validateCaseReference('123')).toBe(false);
      expect(validateCaseReference('12345678901234567')).toBe(false); // 17 digits
      expect(validateCaseReference('123456789012345')).toBe(false); // 15 digits
    });

    it('should reject case reference with non-numeric characters', () => {
      expect(validateCaseReference('1234567890abcdef')).toBe(false);
      expect(validateCaseReference('1234567890123456a')).toBe(false);
      expect(validateCaseReference('123456789012345X')).toBe(false);
    });

    it('should reject SSRF attack attempts - path traversal', () => {
      expect(validateCaseReference('../admin/delete')).toBe(false);
      expect(validateCaseReference('../../etc/passwd')).toBe(false);
      expect(validateCaseReference('1234/../admin')).toBe(false);
    });

    it('should reject SSRF attack attempts - URL manipulation', () => {
      expect(validateCaseReference('@malicious.com')).toBe(false);
      expect(validateCaseReference('localhost:8080')).toBe(false);
      expect(validateCaseReference('http://evil.com')).toBe(false);
      expect(validateCaseReference('1234@evil.com')).toBe(false);
    });

    it('should reject SSRF attack attempts - special characters', () => {
      expect(validateCaseReference('1234567890123456/')).toBe(false);
      expect(validateCaseReference('1234567890123456#')).toBe(false);
      expect(validateCaseReference('1234567890123456?')).toBe(false);
      expect(validateCaseReference('1234567890123456&')).toBe(false);
    });

    it('should reject empty or null values', () => {
      expect(validateCaseReference('')).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(validateCaseReference(null as any)).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(validateCaseReference(undefined as any)).toBe(false);
    });

    it('should reject non-string values', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(validateCaseReference(1234567890123456 as any)).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(validateCaseReference({} as any)).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(validateCaseReference([] as any)).toBe(false);
    });
  });

  describe('sanitizeCaseReference', () => {
    it('should URL encode the case reference', () => {
      expect(sanitizeCaseReference('1761061165632943')).toBe('1761061165632943');
    });

    it('should properly encode special characters', () => {
      expect(sanitizeCaseReference('test@example.com')).toBe('test%40example.com');
      expect(sanitizeCaseReference('test/../admin')).toBe('test%2F..%2Fadmin');
      expect(sanitizeCaseReference('test#123')).toBe('test%23123');
    });

    it('should encode spaces', () => {
      expect(sanitizeCaseReference('test case')).toBe('test%20case');
    });

    it('should encode query parameters', () => {
      expect(sanitizeCaseReference('test?param=value')).toBe('test%3Fparam%3Dvalue');
    });
  });
});
