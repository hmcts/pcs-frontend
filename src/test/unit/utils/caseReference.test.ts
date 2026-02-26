import { sanitiseCaseReference, toCaseReference16 } from '../../../main/utils/caseReference';

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

    describe('Invalid inputs - returns null', () => {
      it('should return null for null', () => {
        const result = toCaseReference16(null);
        expect(result).toBeNull();
      });

      it('should return null for undefined', () => {
        const result = toCaseReference16(undefined);
        expect(result).toBeNull();
      });

      it('should return null for empty string', () => {
        const result = toCaseReference16('');
        expect(result).toBeNull();
      });

      it('should return null for whitespace-only string', () => {
        const result = toCaseReference16('   ');
        expect(result).toBeNull();
      });

      it('should return null for case reference with less than 16 digits', () => {
        const result = toCaseReference16('123456789012345');
        expect(result).toBeNull();
      });

      it('should return null for case reference with more than 16 digits', () => {
        const result = toCaseReference16('12345678901234567');
        expect(result).toBeNull();
      });

      it('should return null for case reference with letters', () => {
        const result = toCaseReference16('123456789012345a');
        expect(result).toBeNull();
      });

      it('should return null for case reference with special characters', () => {
        const result = toCaseReference16('1234567890123-56');
        expect(result).toBeNull();
      });

      it('should return null for boolean true', () => {
        const result = toCaseReference16(true);
        expect(result).toBeNull();
      });

      it('should return null for boolean false', () => {
        const result = toCaseReference16(false);
        expect(result).toBeNull();
      });

      it('should return null for object', () => {
        const result = toCaseReference16({ id: '1234567890123456' });
        expect(result).toBeNull();
      });

      it('should return null for array', () => {
        const result = toCaseReference16(['1234567890123456']);
        expect(result).toBeNull();
      });

      it('should return null for NaN', () => {
        const result = toCaseReference16(NaN);
        expect(result).toBeNull();
      });
    });

    describe('Edge cases', () => {
      it('should return null for negative number', () => {
        const result = toCaseReference16(-1234567890123456);
        expect(result).toBeNull();
      });

      it('should return null for zero', () => {
        const result = toCaseReference16(0);
        expect(result).toBeNull();
      });
    });

    describe('Real-world scenarios', () => {
      it('should return null for session data that is null', () => {
        const sessionCaseId = null;
        const result = toCaseReference16(sessionCaseId);
        expect(result).toBeNull();
      });

      it('should return null for session data that is undefined', () => {
        const session: { ccdCase?: { id?: string } } = {};
        const result = toCaseReference16(session.ccdCase?.id);
        expect(result).toBeNull();
      });

      it('should handle valid session data', () => {
        const session = { ccdCase: { id: '9876543210987654' } };
        const result = toCaseReference16(session.ccdCase.id);
        expect(result).toBe('9876543210987654');
      });

      it('should return null for malformed session data', () => {
        const session = { ccdCase: { id: 'invalid-case-id' } };
        const result = toCaseReference16(session.ccdCase.id);
        expect(result).toBeNull();
      });
    });
  });
});
