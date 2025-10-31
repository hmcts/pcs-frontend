import { CASE_ID, CASE_ID_PATTERN, sanitizeCaseId, validateCaseId } from '../../../main/utils/caseIdValidator';

describe('caseIdValidator', () => {
  describe('Constants', () => {
    it('should export CASE_ID with correct value', () => {
      expect(CASE_ID).toBe('1761927118952549');
      expect(CASE_ID).toHaveLength(16);
    });

    it('should export CASE_ID_PATTERN regex that matches 16 digits', () => {
      expect(CASE_ID_PATTERN.test('1234567890123456')).toBe(true);
      expect(CASE_ID_PATTERN.test('123456789012345')).toBe(false); // 15 digits
      expect(CASE_ID_PATTERN.test('12345678901234567')).toBe(false); // 17 digits
      expect(CASE_ID_PATTERN.test('12345678901234a6')).toBe(false); // contains letter
    });
  });

  describe('validateCaseId', () => {
    describe('valid case IDs', () => {
      it('should return true for valid 16-digit case ID', () => {
        expect(validateCaseId('1234567890123456')).toBe(true);
      });

      it('should return true for the hardcoded CASE_ID', () => {
        expect(validateCaseId(CASE_ID)).toBe(true);
      });

      it('should return true for 16 digits starting with zeros', () => {
        expect(validateCaseId('0000000000000001')).toBe(true);
        expect(validateCaseId('0123456789012345')).toBe(true);
      });

      it('should return true for all nines', () => {
        expect(validateCaseId('9999999999999999')).toBe(true);
      });
    });

    describe('invalid case IDs - wrong length', () => {
      it('should return false for case ID shorter than 16 digits', () => {
        expect(validateCaseId('123456789012345')).toBe(false); // 15 digits
        expect(validateCaseId('12345')).toBe(false); // 5 digits
        expect(validateCaseId('1')).toBe(false); // 1 digit
      });

      it('should return false for case ID longer than 16 digits', () => {
        expect(validateCaseId('12345678901234567')).toBe(false); // 17 digits
        expect(validateCaseId('123456789012345678901234567890')).toBe(false); // 30 digits
      });

      it('should return false for empty string', () => {
        expect(validateCaseId('')).toBe(false);
      });
    });

    describe('invalid case IDs - contains non-digits', () => {
      it('should return false for case ID with letters', () => {
        expect(validateCaseId('123456789012345a')).toBe(false);
        expect(validateCaseId('a234567890123456')).toBe(false);
        expect(validateCaseId('1234567a90123456')).toBe(false);
        expect(validateCaseId('ABCDEFGHIJKLMNOP')).toBe(false);
      });

      it('should return false for case ID with special characters', () => {
        expect(validateCaseId('1234567890123-56')).toBe(false);
        expect(validateCaseId('1234567890123_56')).toBe(false);
        expect(validateCaseId('1234567890123.56')).toBe(false);
        expect(validateCaseId('1234567890123@56')).toBe(false);
        expect(validateCaseId('1234567890123#56')).toBe(false);
        expect(validateCaseId('1234567890123$56')).toBe(false);
      });

      it('should return false for case ID with spaces', () => {
        expect(validateCaseId('1234 567890123456')).toBe(false);
        expect(validateCaseId(' 1234567890123456')).toBe(false);
        expect(validateCaseId('1234567890123456 ')).toBe(false);
        expect(validateCaseId('1234 5678 9012 3456')).toBe(false);
      });

      it('should return false for case ID with hyphens', () => {
        expect(validateCaseId('1234-5678-9012-3456')).toBe(false);
      });
    });

    describe('security - SSRF prevention', () => {
      it('should return false for URL-like patterns', () => {
        expect(validateCaseId('http://evil.com')).toBe(false);
        expect(validateCaseId('https://evil.com')).toBe(false);
        expect(validateCaseId('//evil.com/case')).toBe(false);
      });

      it('should return false for path traversal attempts', () => {
        expect(validateCaseId('../../../etc/pas')).toBe(false);
        expect(validateCaseId('..\\..\\..\\wind')).toBe(false);
      });

      it('should return false for URL-encoded characters', () => {
        expect(validateCaseId('1234567890%2F3456')).toBe(false);
        expect(validateCaseId('1234567890%2E3456')).toBe(false);
      });

      it('should return false for case IDs with slashes', () => {
        expect(validateCaseId('1234567890/23456')).toBe(false);
        expect(validateCaseId('1234567890\\23456')).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should return false for whitespace-only string', () => {
        expect(validateCaseId('                ')).toBe(false); // 16 spaces
        expect(validateCaseId('\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t')).toBe(false); // 16 tabs
      });

      it('should return false for newlines and special whitespace', () => {
        expect(validateCaseId('1234567890123\n56')).toBe(false);
        expect(validateCaseId('1234567890123\r56')).toBe(false);
        expect(validateCaseId('1234567890123\t56')).toBe(false);
      });

      it('should return false for mixed valid and invalid characters', () => {
        expect(validateCaseId('123456789012345X')).toBe(false);
        expect(validateCaseId('12345678-0123456')).toBe(false);
      });
    });
  });

  describe('sanitizeCaseId', () => {
    describe('already clean input', () => {
      it('should return unchanged when input is already clean 16 digits', () => {
        expect(sanitizeCaseId('1234567890123456')).toBe('1234567890123456');
      });

      it('should return unchanged for the hardcoded CASE_ID', () => {
        expect(sanitizeCaseId(CASE_ID)).toBe(CASE_ID);
      });

      it('should return unchanged for any length of digits', () => {
        expect(sanitizeCaseId('123')).toBe('123');
        expect(sanitizeCaseId('12345678901234567890')).toBe('12345678901234567890');
      });
    });

    describe('removing invalid characters', () => {
      it('should remove hyphens', () => {
        expect(sanitizeCaseId('1234-5678-9012-3456')).toBe('1234567890123456');
        expect(sanitizeCaseId('1-2-3-4-5-6-7-8-9-0-1-2-3-4-5-6')).toBe('1234567890123456');
      });

      it('should remove spaces', () => {
        expect(sanitizeCaseId('1234 5678 9012 3456')).toBe('1234567890123456');
        expect(sanitizeCaseId(' 1234567890123456 ')).toBe('1234567890123456');
        expect(sanitizeCaseId('1234 567 890 123 456')).toBe('1234567890123456');
      });

      it('should remove letters', () => {
        expect(sanitizeCaseId('1234abc5678def90')).toBe('1234567890');
        expect(sanitizeCaseId('ABC1234567890123456XYZ')).toBe('1234567890123456');
      });

      it('should remove special characters', () => {
        expect(sanitizeCaseId('1234@5678#9012$3456')).toBe('1234567890123456');
        expect(sanitizeCaseId('1234.5678.9012.3456')).toBe('1234567890123456');
        expect(sanitizeCaseId('1234_5678_9012_3456')).toBe('1234567890123456');
      });

      it('should remove mixed invalid characters', () => {
        expect(sanitizeCaseId('12a34-56b78.90c12_34d56')).toBe('1234567890123456');
        expect(sanitizeCaseId('!1@2#3$4%5^6&7*8(9)0_1+2=3{4}5[6]')).toBe('1234567890123456');
      });
    });

    describe('security - sanitization defense', () => {
      it('should sanitize URL-like patterns to digits only', () => {
        expect(sanitizeCaseId('http://123.456.789.012')).toBe('123456789012');
        expect(sanitizeCaseId('https://evil.com/1234567890123456')).toBe('1234567890123456');
      });

      it('should sanitize path traversal attempts to digits only', () => {
        expect(sanitizeCaseId('../../../1234567890123456')).toBe('1234567890123456');
        expect(sanitizeCaseId('..\\..\\..\\1234567890123456')).toBe('1234567890123456');
      });

      it('should sanitize URL-encoded characters', () => {
        expect(sanitizeCaseId('1234567890%2F3456')).toBe('123456789023456');
        expect(sanitizeCaseId('1234%20567890123456')).toBe('123420567890123456');
      });

      it('should remove slashes', () => {
        expect(sanitizeCaseId('1234/5678/9012/3456')).toBe('1234567890123456');
        expect(sanitizeCaseId('1234\\5678\\9012\\3456')).toBe('1234567890123456');
      });
    });

    describe('edge cases', () => {
      it('should return empty string when input has no digits', () => {
        expect(sanitizeCaseId('abcdefghijklmnop')).toBe('');
        expect(sanitizeCaseId('!@#$%^&*()_+')).toBe('');
        expect(sanitizeCaseId('----------------')).toBe('');
      });

      it('should return empty string for empty input', () => {
        expect(sanitizeCaseId('')).toBe('');
      });

      it('should handle whitespace-only input', () => {
        expect(sanitizeCaseId('   ')).toBe('');
        expect(sanitizeCaseId('\t\t\t')).toBe('');
        expect(sanitizeCaseId('\n\r\n')).toBe('');
      });

      it('should extract digits from complex mixed input', () => {
        expect(sanitizeCaseId('Case-ID: 1234-5678-9012-3456 (valid)')).toBe('1234567890123456');
        expect(sanitizeCaseId('[1234] (5678) {9012} <3456>')).toBe('1234567890123456');
      });

      it('should preserve all digits regardless of length', () => {
        expect(sanitizeCaseId('1')).toBe('1');
        expect(sanitizeCaseId('12345')).toBe('12345');
        expect(sanitizeCaseId('123456789012345678901234567890')).toBe('123456789012345678901234567890');
      });
    });

    describe('validation after sanitization', () => {
      it('sanitized output should pass validation if it results in 16 digits', () => {
        const sanitized = sanitizeCaseId('1234-5678-9012-3456');
        expect(sanitized).toBe('1234567890123456');
        expect(validateCaseId(sanitized)).toBe(true);
      });

      it('sanitized output may not pass validation if result is not 16 digits', () => {
        const sanitized = sanitizeCaseId('1234-5678-90');
        expect(sanitized).toBe('1234567890');
        expect(validateCaseId(sanitized)).toBe(false);
      });
    });
  });
});
