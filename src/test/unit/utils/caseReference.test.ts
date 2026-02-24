import { DEFAULT_CASE_REFERENCE, sanitiseCaseReference, toCaseReference16 } from '../../../main/utils/caseReference';

describe('caseReference utilities', () => {
  describe('sanitiseCaseReference', () => {
    describe('Valid case references', () => {
      it('should return valid 16-digit string case reference', () => {
        const result = sanitiseCaseReference('1234567890123456');
        expect(result).toBe('1234567890123456');
      });

      it('should return valid 16-digit number case reference as string', () => {
        const result = sanitiseCaseReference(1234567890123456);
        expect(result).toBe('1234567890123456');
      });

      it('should handle case reference with all zeros', () => {
        const result = sanitiseCaseReference('0000000000000000');
        expect(result).toBe('0000000000000000');
      });

      it('should handle case reference with all nines', () => {
        const result = sanitiseCaseReference('9999999999999999');
        expect(result).toBe('9999999999999999');
      });
    });

    describe('Invalid case references', () => {
      it('should return null for case reference with less than 16 digits', () => {
        const result = sanitiseCaseReference('123456789012345');
        expect(result).toBeNull();
      });

      it('should return null for case reference with more than 16 digits', () => {
        const result = sanitiseCaseReference('12345678901234567');
        expect(result).toBeNull();
      });

      it('should return null for case reference with letters', () => {
        const result = sanitiseCaseReference('123456789012345a');
        expect(result).toBeNull();
      });

      it('should return null for case reference with special characters', () => {
        const result = sanitiseCaseReference('1234567890123-56');
        expect(result).toBeNull();
      });

      it('should return null for empty string', () => {
        const result = sanitiseCaseReference('');
        expect(result).toBeNull();
      });

      it('should return null for case reference with spaces', () => {
        const result = sanitiseCaseReference('1234 567890123456');
        expect(result).toBeNull();
      });
    });
  });

  describe('toCaseReference16', () => {
    describe('Valid case references', () => {
      it('should return valid 16-digit string case reference', () => {
        const result = toCaseReference16('1234567890123456');
        expect(result).toBe('1234567890123456');
      });

      it('should return valid 16-digit number case reference as string', () => {
        const result = toCaseReference16(1234567890123456);
        expect(result).toBe('1234567890123456');
      });

      it('should handle case reference with leading/trailing whitespace', () => {
        const result = toCaseReference16('  1234567890123456  ');
        expect(result).toBe('1234567890123456');
      });

      it('should handle case reference with all zeros', () => {
        const result = toCaseReference16('0000000000000000');
        expect(result).toBe('0000000000000000');
      });

      it('should handle case reference with all nines', () => {
        const result = toCaseReference16('9999999999999999');
        expect(result).toBe('9999999999999999');
      });
    });

    describe('Invalid inputs - returns default', () => {
      it('should return default for null', () => {
        const result = toCaseReference16(null);
        expect(result).toBe(DEFAULT_CASE_REFERENCE);
      });

      it('should return default for undefined', () => {
        const result = toCaseReference16(undefined);
        expect(result).toBe(DEFAULT_CASE_REFERENCE);
      });

      it('should return default for empty string', () => {
        const result = toCaseReference16('');
        expect(result).toBe(DEFAULT_CASE_REFERENCE);
      });

      it('should return default for whitespace-only string', () => {
        const result = toCaseReference16('   ');
        expect(result).toBe(DEFAULT_CASE_REFERENCE);
      });

      it('should return default for case reference with less than 16 digits', () => {
        const result = toCaseReference16('123456789012345');
        expect(result).toBe(DEFAULT_CASE_REFERENCE);
      });

      it('should return default for case reference with more than 16 digits', () => {
        const result = toCaseReference16('12345678901234567');
        expect(result).toBe(DEFAULT_CASE_REFERENCE);
      });

      it('should return default for case reference with letters', () => {
        const result = toCaseReference16('123456789012345a');
        expect(result).toBe(DEFAULT_CASE_REFERENCE);
      });

      it('should return default for case reference with special characters', () => {
        const result = toCaseReference16('1234567890123-56');
        expect(result).toBe(DEFAULT_CASE_REFERENCE);
      });

      it('should return default for boolean true', () => {
        const result = toCaseReference16(true);
        expect(result).toBe(DEFAULT_CASE_REFERENCE);
      });

      it('should return default for boolean false', () => {
        const result = toCaseReference16(false);
        expect(result).toBe(DEFAULT_CASE_REFERENCE);
      });

      it('should return default for object', () => {
        const result = toCaseReference16({ id: '1234567890123456' });
        expect(result).toBe(DEFAULT_CASE_REFERENCE);
      });

      it('should return default for array', () => {
        const result = toCaseReference16(['1234567890123456']);
        expect(result).toBe(DEFAULT_CASE_REFERENCE);
      });

      it('should return default for NaN', () => {
        const result = toCaseReference16(NaN);
        expect(result).toBe(DEFAULT_CASE_REFERENCE);
      });
    });

    describe('Edge cases', () => {
      it('should handle negative number', () => {
        const result = toCaseReference16(-1234567890123456);
        expect(result).toBe(DEFAULT_CASE_REFERENCE);
      });

      it('should handle zero', () => {
        const result = toCaseReference16(0);
        expect(result).toBe(DEFAULT_CASE_REFERENCE);
      });
    });

    describe('Real-world scenarios', () => {
      it('should handle session data that is null', () => {
        const sessionCaseId = null;
        const result = toCaseReference16(sessionCaseId);
        expect(result).toBe(DEFAULT_CASE_REFERENCE);
      });

      it('should handle session data that is undefined', () => {
        const session: { ccdCase?: { id?: string } } = {};
        const result = toCaseReference16(session.ccdCase?.id);
        expect(result).toBe(DEFAULT_CASE_REFERENCE);
      });

      it('should handle valid session data', () => {
        const session = { ccdCase: { id: '9876543210987654' } };
        const result = toCaseReference16(session.ccdCase.id);
        expect(result).toBe('9876543210987654');
      });

      it('should handle malformed session data', () => {
        const session = { ccdCase: { id: 'invalid-case-id' } };
        const result = toCaseReference16(session.ccdCase.id);
        expect(result).toBe(DEFAULT_CASE_REFERENCE);
      });
    });
  });

  describe('DEFAULT_CASE_REFERENCE constant', () => {
    it('should be a valid 16-digit case reference', () => {
      expect(DEFAULT_CASE_REFERENCE).toMatch(/^\d{16}$/);
    });

    it('should be exactly 16 characters long', () => {
      expect(DEFAULT_CASE_REFERENCE).toHaveLength(16);
    });

    it('should be the expected default value', () => {
      expect(DEFAULT_CASE_REFERENCE).toBe('1234567890123456');
    });
  });
});
