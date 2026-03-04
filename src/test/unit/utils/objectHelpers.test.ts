import { filterNonEmptyValues, isNonEmpty } from '../../../main/utils/objectHelpers';

describe('objectHelpers', () => {
  describe('isNonEmpty', () => {
    describe('should return true for non-empty values', () => {
      it('should return true for non-empty strings', () => {
        expect(isNonEmpty('hello')).toBe(true);
        expect(isNonEmpty('0')).toBe(true);
        expect(isNonEmpty(' ')).toBe(true); // Space is not empty
      });

      it('should return true for numbers', () => {
        expect(isNonEmpty(0)).toBe(true);
        expect(isNonEmpty(1)).toBe(true);
        expect(isNonEmpty(-1)).toBe(true);
        expect(isNonEmpty(42)).toBe(true);
      });

      it('should return true for booleans', () => {
        expect(isNonEmpty(true)).toBe(true);
        expect(isNonEmpty(false)).toBe(true); // false is a valid value
      });

      it('should return true for objects', () => {
        expect(isNonEmpty({})).toBe(true);
        expect(isNonEmpty({ key: 'value' })).toBe(true);
      });

      it('should return true for arrays', () => {
        expect(isNonEmpty([])).toBe(true);
        expect(isNonEmpty(['item'])).toBe(true);
      });

      it('should return true for functions', () => {
        expect(isNonEmpty(() => {})).toBe(true);
      });

      it('should return true for Date objects', () => {
        expect(isNonEmpty(new Date())).toBe(true);
      });
    });

    describe('should return false for empty values', () => {
      it('should return false for undefined', () => {
        expect(isNonEmpty(undefined)).toBe(false);
      });

      it('should return false for null', () => {
        expect(isNonEmpty(null)).toBe(false);
      });

      it('should return false for empty string', () => {
        expect(isNonEmpty('')).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should return true for NaN', () => {
        expect(isNonEmpty(NaN)).toBe(true); // NaN is a valid number
      });

      it('should return true for Infinity', () => {
        expect(isNonEmpty(Infinity)).toBe(true);
      });

      it('should return true for symbols', () => {
        expect(isNonEmpty(Symbol('test'))).toBe(true);
      });

      it('should return true for BigInt', () => {
        expect(isNonEmpty(BigInt(9007199254740991))).toBe(true);
      });
    });
  });

  describe('filterNonEmptyValues', () => {
    describe('should filter out empty values', () => {
      it('should remove undefined values', () => {
        const input = {
          name: 'John',
          age: undefined,
          email: 'john@example.com',
        };

        const result = filterNonEmptyValues(input);

        expect(result).toEqual({
          name: 'John',
          email: 'john@example.com',
        });
        expect(result.age).toBeUndefined();
      });

      it('should remove null values', () => {
        const input = {
          name: 'Jane',
          age: null,
          email: 'jane@example.com',
        };

        const result = filterNonEmptyValues(input);

        expect(result).toEqual({
          name: 'Jane',
          email: 'jane@example.com',
        });
        expect(result.age).toBeUndefined();
      });

      it('should remove empty string values', () => {
        const input = {
          name: 'Bob',
          middleName: '',
          email: 'bob@example.com',
        };

        const result = filterNonEmptyValues(input);

        expect(result).toEqual({
          name: 'Bob',
          email: 'bob@example.com',
        });
        expect(result.middleName).toBeUndefined();
      });

      it('should remove multiple empty values', () => {
        const input = {
          name: 'Alice',
          age: undefined,
          email: null,
          phone: '',
          city: 'London',
        };

        const result = filterNonEmptyValues(input);

        expect(result).toEqual({
          name: 'Alice',
          city: 'London',
        });
      });
    });

    describe('should preserve non-empty values', () => {
      it('should keep zero as a valid value', () => {
        const input = {
          name: 'Test',
          count: 0,
        };

        const result = filterNonEmptyValues(input);

        expect(result).toEqual({
          name: 'Test',
          count: 0,
        });
      });

      it('should keep false as a valid value', () => {
        const input = {
          name: 'Test',
          isActive: false,
        };

        const result = filterNonEmptyValues(input);

        expect(result).toEqual({
          name: 'Test',
          isActive: false,
        });
      });

      it('should keep empty objects', () => {
        const input = {
          name: 'Test',
          metadata: {},
        };

        const result = filterNonEmptyValues(input);

        expect(result).toEqual({
          name: 'Test',
          metadata: {},
        });
      });

      it('should keep empty arrays', () => {
        const input = {
          name: 'Test',
          tags: [],
        };

        const result = filterNonEmptyValues(input);

        expect(result).toEqual({
          name: 'Test',
          tags: [],
        });
      });

      it('should keep spaces as valid strings', () => {
        const input = {
          name: 'Test',
          description: '   ',
        };

        const result = filterNonEmptyValues(input);

        expect(result).toEqual({
          name: 'Test',
          description: '   ',
        });
      });
    });

    describe('edge cases', () => {
      it('should handle empty object', () => {
        const input = {};
        const result = filterNonEmptyValues(input);

        expect(result).toEqual({});
      });

      it('should handle object with all empty values', () => {
        const input = {
          a: undefined,
          b: null,
          c: '',
        };

        const result = filterNonEmptyValues(input);

        expect(result).toEqual({});
      });

      it('should handle nested objects (shallow filter only)', () => {
        const input = {
          name: 'Test',
          address: {
            street: 'Main St',
            city: '',
          },
        };

        const result = filterNonEmptyValues(input);

        // Only filters top-level, nested objects preserved as-is
        expect(result).toEqual({
          name: 'Test',
          address: {
            street: 'Main St',
            city: '',
          },
        });
      });

      it('should preserve object with Date values', () => {
        const date = new Date('2026-02-12');
        const input = {
          name: 'Test',
          createdAt: date,
        };

        const result = filterNonEmptyValues(input);

        expect(result).toEqual({
          name: 'Test',
          createdAt: date,
        });
      });

      it('should preserve object with function values', () => {
        const fn = () => 'test';
        const input = {
          name: 'Test',
          callback: fn,
        };

        const result = filterNonEmptyValues(input);

        expect(result).toEqual({
          name: 'Test',
          callback: fn,
        });
      });
    });

    describe('real-world use cases', () => {
      it('should filter form data with optional fields', () => {
        const formData = {
          firstName: 'John',
          middleName: '', // Optional, not provided
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: null, // Optional, not provided
          age: 30,
          newsletter: false, // Explicitly declined
        };

        const result = filterNonEmptyValues(formData);

        expect(result).toEqual({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          age: 30,
          newsletter: false,
        });
      });

      it('should filter CCD payload with partial data', () => {
        const payload = {
          defendantName: 'Jane Smith',
          defendantEmail: undefined,
          defendantPhone: '',
          defendantAddress: {
            line1: '123 Main St',
            line2: null,
          },
          receivedAdvice: 'YES',
        };

        const result = filterNonEmptyValues(payload);

        expect(result).toEqual({
          defendantName: 'Jane Smith',
          defendantAddress: {
            line1: '123 Main St',
            line2: null, // Nested object not filtered
          },
          receivedAdvice: 'YES',
        });
      });

      it('should filter passThrough mapper output', () => {
        // Simulating passThrough(['firstName', 'lastName', 'email']) output
        const selectedFields = {
          firstName: 'Alice',
          lastName: 'Johnson',
          email: '', // User didn't provide email
        };

        const result = filterNonEmptyValues(selectedFields);

        expect(result).toEqual({
          firstName: 'Alice',
          lastName: 'Johnson',
        });
      });
    });

    describe('type preservation', () => {
      it('should return Partial<T> type', () => {
        const input = {
          name: 'Test',
          age: 25,
          email: '',
        };

        const result = filterNonEmptyValues(input);

        expect(result.name).toBe('Test');
        expect(result.age).toBe(25);
        expect(result.email).toBeUndefined();
      });
    });
  });

  describe('integration tests', () => {
    it('should work together in passThrough-like scenario', () => {
      const formData: Record<string, unknown> = {
        firstName: 'John',
        lastName: 'Doe',
        middleName: '',
        email: 'john@example.com',
        phone: null,
        age: undefined,
      };

      const fieldNames = ['firstName', 'lastName', 'middleName', 'email', 'phone'];

      // Simulate passThrough behavior
      const selectedFields: Record<string, unknown> = {};
      for (const fieldName of fieldNames) {
        if (fieldName in formData) {
          selectedFields[fieldName] = formData[fieldName];
        }
      }

      const result = filterNonEmptyValues(selectedFields);

      expect(result).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });
    });

    it('should handle CCD auto-save transformation flow', () => {
      // Step 1: Form data from session
      const sessionFormData = {
        hadLegalAdvice: 'yes',
        legalAdviceDetails: undefined,
        timestamp: Date.now(),
      };

      // Step 2: Extract relevant fields
      const relevantData = {
        hadLegalAdvice: sessionFormData.hadLegalAdvice,
        legalAdviceDetails: sessionFormData.legalAdviceDetails,
      };

      // Step 3: Filter empty values
      const filteredData = filterNonEmptyValues(relevantData);

      expect(filteredData).toEqual({
        hadLegalAdvice: 'yes',
      });
      expect(Object.keys(filteredData)).toHaveLength(1);
    });
  });
});
