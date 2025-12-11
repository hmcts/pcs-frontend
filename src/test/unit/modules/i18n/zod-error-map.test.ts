import type { $ZodRawIssue } from 'zod/v4/core/errors';

// Mock i18next - must be declared before importing the SUT
const mockT = jest.fn((key: string | string[], options?: { defaultValue?: string; ns?: string; [key: string]: unknown }) => {
  return options?.defaultValue || (Array.isArray(key) ? key[0] : key);
});

jest.mock('i18next', () => ({
  __esModule: true,
  default: {
    t: mockT,
  },
}));

// Import SUT AFTER mocks
import { makeZodI18nMap } from '../../../../main/modules/i18n/zod-error-map';

describe('zod-error-map', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('makeZodI18nMap', () => {
    it('should return a function', () => {
      const errorMap = makeZodI18nMap();
      expect(typeof errorMap).toBe('function');
    });

    it('should use default namespace when no options provided', () => {
      const errorMap = makeZodI18nMap();
      const issue: $ZodRawIssue = {
        code: 'invalid_type',
        message: 'Test message',
        input: 'test',
        expected: 'string',
        path: [],
      };

      errorMap(issue);

      expect(mockT).toHaveBeenCalledWith(
        'errors.invalid_type',
        expect.objectContaining({
          ns: 'zod',
        })
      );
    });

    it('should use custom namespace when provided', () => {
      const errorMap = makeZodI18nMap({ ns: 'custom' });
      const issue: $ZodRawIssue = {
        code: 'invalid_type',
        message: 'Test message',
        input: 'test',
        expected: 'string',
        path: [],
      };

      errorMap(issue);

      expect(mockT).toHaveBeenCalledWith(
        'errors.invalid_type',
        expect.objectContaining({
          ns: 'custom',
        })
      );
    });

    it('should use custom translation function when provided', () => {
      const customT = jest.fn((key: string) => `Custom: ${key}`) as any;
      const errorMap = makeZodI18nMap({ t: customT });
      const issue: $ZodRawIssue = {
        code: 'invalid_type',
        message: 'Test message',
        input: 'test',
        expected: 'string',
        path: [],
      };

      errorMap(issue);

      expect(customT).toHaveBeenCalled();
      expect(mockT).not.toHaveBeenCalled();
    });

    describe('invalid_type error', () => {
      it('should handle invalid_type with undefined input', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue = {
          code: 'invalid_type',
          message: 'Required',
          input: undefined,
          expected: 'string',
          path: [],
        };

        const result = errorMap(issue);

        expect(result).toEqual({ message: expect.any(String) });
        expect(mockT).toHaveBeenCalledWith('errors.invalid_type_received_undefined', {
          ns: 'zod',
          defaultValue: 'Required',
        });
      });

      it('should handle invalid_type with null input', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue = {
          code: 'invalid_type',
          message: 'Required',
          input: null,
          expected: 'string',
          path: [],
        };

        const result = errorMap(issue);

        expect(result).toEqual({ message: expect.any(String) });
        expect(mockT).toHaveBeenCalledWith('errors.invalid_type_received_null', {
          ns: 'zod',
          defaultValue: 'Required',
        });
      });

      it('should handle invalid_type with type mismatch', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue = {
          code: 'invalid_type',
          message: 'Expected string, received number',
          input: 123,
          expected: 'string',
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.invalid_type', {
          expected: expect.any(String),
          received: expect.any(String),
          ns: 'zod',
          defaultValue: 'Expected string, received number',
        });
      });

      it('should handle invalid_type with array input', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue = {
          code: 'invalid_type',
          message: 'Expected string, received array',
          input: [1, 2, 3],
          expected: 'string',
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('types.array', {
          defaultValue: 'array',
          ns: 'zod',
        });
      });

      it('should handle invalid_type with date input', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue = {
          code: 'invalid_type',
          message: 'Expected string, received date',
          input: new Date(),
          expected: 'string',
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('types.date', {
          defaultValue: 'date',
          ns: 'zod',
        });
      });

      it('should handle invalid_type with NaN input', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue = {
          code: 'invalid_type',
          message: 'Expected number, received nan',
          input: NaN,
          expected: 'number',
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('types.nan', {
          defaultValue: 'nan',
          ns: 'zod',
        });
      });
    });

    describe('invalid_literal error', () => {
      it('should handle invalid_literal error', () => {
        const errorMap = makeZodI18nMap();
        const issue = {
          code: 'invalid_literal' as any,
          message: 'Invalid literal',
          input: 'wrong',
          expected: 'correct',
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.invalid_literal', {
          expected: '"correct"',
          ns: 'zod',
          defaultValue: 'Invalid literal',
        });
      });

      it('should handle invalid_literal with bigint', () => {
        const errorMap = makeZodI18nMap();
        const issue = {
          code: 'invalid_literal' as any,
          message: 'Invalid literal',
          input: BigInt(123),
          expected: BigInt(456),
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.invalid_literal', {
          expected: expect.stringContaining('456'),
          ns: 'zod',
          defaultValue: 'Invalid literal',
        });
      });
    });

    describe('unrecognized_keys error', () => {
      it('should handle unrecognized_keys error', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue & { keys?: string[] } = {
          code: 'unrecognized_keys',
          message: 'Unrecognized keys',
          input: {},
          keys: ['key1', 'key2'],
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.unrecognized_keys', {
          keys: "'key1', 'key2'",
          count: 2,
          ns: 'zod',
          defaultValue: 'Unrecognized keys',
        });
      });

      it('should handle unrecognized_keys with empty keys array', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue & { keys?: string[] } = {
          code: 'unrecognized_keys',
          message: 'Unrecognized keys',
          input: {},
          keys: [],
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.unrecognized_keys', {
          keys: '',
          count: 0,
          ns: 'zod',
          defaultValue: 'Unrecognized keys',
        });
      });
    });

    describe('invalid_union error', () => {
      it('should handle invalid_union error', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue = {
          code: 'invalid_union',
          message: 'Invalid union',
          input: 'test',
          errors: [],
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.invalid_union', {
          ns: 'zod',
          defaultValue: 'Invalid union',
        });
      });
    });

    describe('invalid_union_discriminator error', () => {
      it('should handle invalid_union_discriminator error', () => {
        const errorMap = makeZodI18nMap();
        const issue = {
          code: 'invalid_union_discriminator' as any,
          message: 'Invalid discriminator',
          input: 'test',
          options: ['option1', 'option2'],
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.invalid_union_discriminator', {
          options: "'option1' | 'option2'",
          ns: 'zod',
          defaultValue: 'Invalid discriminator',
        });
      });
    });

    describe('invalid_enum_value error', () => {
      it('should handle invalid_enum_value error', () => {
        const errorMap = makeZodI18nMap();
        const issue = {
          code: 'invalid_enum_value' as any,
          message: 'Invalid enum',
          input: 'invalid',
          options: ['value1', 'value2'],
          received: 'invalid',
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.invalid_enum_value', {
          options: "'value1' | 'value2'",
          received: 'invalid',
          ns: 'zod',
          defaultValue: 'Invalid enum',
        });
      });
    });

    describe('invalid_arguments error', () => {
      it('should handle invalid_arguments error', () => {
        const errorMap = makeZodI18nMap();
        const issue = {
          code: 'invalid_arguments' as any,
          message: 'Invalid arguments',
          input: {},
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.invalid_arguments', {
          ns: 'zod',
          defaultValue: 'Invalid arguments',
        });
      });
    });

    describe('invalid_return_type error', () => {
      it('should handle invalid_return_type error', () => {
        const errorMap = makeZodI18nMap();
        const issue = {
          code: 'invalid_return_type' as any,
          message: 'Invalid return type',
          input: {},
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.invalid_return_type', {
          ns: 'zod',
          defaultValue: 'Invalid return type',
        });
      });
    });

    describe('invalid_date error', () => {
      it('should handle invalid_date error', () => {
        const errorMap = makeZodI18nMap();
        const issue = {
          code: 'invalid_date' as any,
          message: 'Invalid date',
          input: 'invalid',
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.invalid_date', {
          ns: 'zod',
          defaultValue: 'Invalid date',
        });
      });
    });

    describe('invalid_format error', () => {
      it('should handle invalid_format with email format', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue & { format?: string } = {
          code: 'invalid_format',
          message: 'Invalid email',
          input: 'notanemail',
          format: 'email',
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.invalid_string.email', {
          validation: expect.any(String),
          ns: 'zod',
          defaultValue: 'Invalid email',
        });
      });

      it('should handle invalid_format with starts_with format', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue & { format?: string; prefix?: string } = {
          code: 'invalid_format',
          message: 'Invalid format',
          input: 'test',
          format: 'starts_with',
          prefix: 'prefix',
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.invalid_string.startsWith', {
          startsWith: 'prefix',
          ns: 'zod',
          defaultValue: 'Invalid format',
        });
      });

      it('should handle invalid_format with ends_with format', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue & { format?: string; suffix?: string } = {
          code: 'invalid_format',
          message: 'Invalid format',
          input: 'test',
          format: 'ends_with',
          suffix: 'suffix',
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.invalid_string.endsWith', {
          endsWith: 'suffix',
          ns: 'zod',
          defaultValue: 'Invalid format',
        });
      });
    });

    describe('too_small error', () => {
      it('should handle too_small for string with exact', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue & { origin?: string; minimum?: number; exact?: boolean } = {
          code: 'too_small',
          message: 'Too small',
          input: 'ab',
          origin: 'string',
          minimum: 5,
          exact: true,
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.too_small.string.exact', {
          minimum: 5,
          count: 5,
          ns: 'zod',
          defaultValue: 'Too small',
        });
      });

      it('should handle too_small for string with inclusive', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue & { origin?: string; minimum?: number; inclusive?: boolean } = {
          code: 'too_small',
          message: 'Too small',
          input: 'ab',
          origin: 'string',
          minimum: 5,
          inclusive: true,
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.too_small.string.inclusive', {
          minimum: 5,
          count: 5,
          ns: 'zod',
          defaultValue: 'Too small',
        });
      });

      it('should handle too_small for array', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue & { origin?: string; minimum?: number; inclusive?: boolean } = {
          code: 'too_small',
          message: 'Too small',
          input: [1],
          origin: 'array',
          minimum: 3,
          inclusive: true,
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.too_small.array.inclusive', {
          minimum: 3,
          count: 3,
          ns: 'zod',
          defaultValue: 'Too small',
        });
      });

      it('should handle too_small for number', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue & { origin?: string; minimum?: number; inclusive?: boolean } = {
          code: 'too_small',
          message: 'Too small',
          input: 5,
          origin: 'number',
          minimum: 10,
          inclusive: true,
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.too_small.number.inclusive', {
          minimum: 10,
          count: 10,
          ns: 'zod',
          defaultValue: 'Too small',
        });
      });

      it('should handle too_small for date', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue & { origin?: string; minimum?: number; inclusive?: boolean } = {
          code: 'too_small',
          message: 'Too small',
          input: new Date('2020-01-01'),
          origin: 'date',
          minimum: new Date('2021-01-01').getTime(),
          inclusive: true,
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.too_small.date.inclusive', {
          minimum: expect.any(Date),
          count: expect.any(Number),
          ns: 'zod',
          defaultValue: 'Too small',
        });
      });
    });

    describe('too_big error', () => {
      it('should handle too_big for string with exact', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue & { origin?: string; maximum?: number; exact?: boolean } = {
          code: 'too_big',
          message: 'Too big',
          input: 'toolong',
          origin: 'string',
          maximum: 5,
          exact: true,
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.too_big.string.exact', {
          maximum: 5,
          count: 5,
          ns: 'zod',
          defaultValue: 'Too big',
        });
      });

      it('should handle too_big for array', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue & { origin?: string; maximum?: number; inclusive?: boolean } = {
          code: 'too_big',
          message: 'Too big',
          input: [1, 2, 3, 4, 5],
          origin: 'array',
          maximum: 3,
          inclusive: true,
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.too_big.array.inclusive', {
          maximum: 3,
          count: 3,
          ns: 'zod',
          defaultValue: 'Too big',
        });
      });

      it('should handle too_big for number', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue & { origin?: string; maximum?: number; inclusive?: boolean } = {
          code: 'too_big',
          message: 'Too big',
          input: 15,
          origin: 'number',
          maximum: 10,
          inclusive: true,
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.too_big.number.inclusive', {
          maximum: 10,
          count: 10,
          ns: 'zod',
          defaultValue: 'Too big',
        });
      });

      it('should handle too_big for date', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue & { origin?: string; maximum?: number; inclusive?: boolean } = {
          code: 'too_big',
          message: 'Too big',
          input: new Date('2022-01-01'),
          origin: 'date',
          maximum: new Date('2021-01-01').getTime(),
          inclusive: true,
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.too_big.date.inclusive', {
          maximum: expect.any(Date),
          count: expect.any(Number),
          ns: 'zod',
          defaultValue: 'Too big',
        });
      });
    });

    describe('custom error', () => {
      it('should handle custom error with string key', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue & { params?: { i18n?: string } } = {
          code: 'custom',
          message: 'Custom error',
          input: {},
          params: {
            i18n: 'errors.custom_key',
          },
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.custom_key', {
          ns: 'zod',
          defaultValue: 'Custom error',
        });
      });

      it('should handle custom error with object key and values', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue & { params?: { i18n?: { key: string; values: Record<string, unknown> } } } = {
          code: 'custom',
          message: 'Custom error',
          input: {},
          params: {
            i18n: {
              key: 'errors.custom_key',
              values: { param1: 'value1', param2: 123 },
            },
          },
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.custom_key', {
          param1: 'value1',
          param2: 123,
          ns: 'zod',
          defaultValue: 'Custom error',
        });
      });

      it('should handle custom error with default key when params missing', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue = {
          code: 'custom',
          message: 'Custom error',
          input: {},
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.custom', {
          ns: 'zod',
          defaultValue: 'Custom error',
        });
      });
    });

    describe('invalid_intersection_types error', () => {
      it('should handle invalid_intersection_types error', () => {
        const errorMap = makeZodI18nMap();
        const issue = {
          code: 'invalid_intersection_types' as any,
          message: 'Invalid intersection',
          input: {},
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.invalid_intersection_types', {
          ns: 'zod',
          defaultValue: 'Invalid intersection',
        });
      });
    });

    describe('not_multiple_of error', () => {
      it('should handle not_multiple_of error', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue & { divisor?: number } = {
          code: 'not_multiple_of',
          message: 'Not multiple of',
          input: 7,
          divisor: 3,
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.not_multiple_of', {
          multipleOf: 3,
          ns: 'zod',
          defaultValue: 'Not multiple of',
        });
      });
    });

    describe('not_finite error', () => {
      it('should handle not_finite error', () => {
        const errorMap = makeZodI18nMap();
        const issue = {
          code: 'not_finite' as any,
          message: 'Not finite',
          input: Infinity,
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.not_finite', {
          ns: 'zod',
          defaultValue: 'Not finite',
        });
      });
    });

    describe('path handling', () => {
      it('should handle path translation when path is provided', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue = {
          code: 'invalid_type',
          message: 'Invalid type',
          input: 'test',
          expected: 'number',
          path: ['field1', 'field2'],
        };

        errorMap(issue);

        // Should call t for path translation
        expect(mockT).toHaveBeenCalledWith('field1.field2', {
          ns: 'zod',
          defaultValue: 'field1.field2',
        });
      });

      it('should handle path with keyPrefix', () => {
        const errorMap = makeZodI18nMap({
          handlePath: {
            keyPrefix: 'fields',
          },
        });
        const issue: $ZodRawIssue = {
          code: 'invalid_type',
          message: 'Invalid type',
          input: 'test',
          expected: 'number',
          path: ['field1'],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('fields.field1', {
          ns: 'zod',
          defaultValue: 'field1',
        });
      });

      it('should not handle path when handlePath is false', () => {
        const errorMap = makeZodI18nMap({ handlePath: false });
        const issue: $ZodRawIssue = {
          code: 'invalid_type',
          message: 'Invalid type',
          input: 'test',
          expected: 'number',
          path: ['field1', 'field2'],
        };

        errorMap(issue);

        // Should not call t for path translation
        const pathCalls = mockT.mock.calls.filter(call => {
          const key = Array.isArray(call[0]) ? call[0][0] : call[0];
          return key === 'field1.field2';
        });
        expect(pathCalls).toHaveLength(0);
      });

      it('should handle empty path array', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue = {
          code: 'invalid_type',
          message: 'Invalid type',
          input: 'test',
          expected: 'number',
          path: [],
        };

        errorMap(issue);

        // Should not call t for path translation when path is empty
        const pathCalls = mockT.mock.calls.filter(call => {
          const key = Array.isArray(call[0]) ? call[0][0] : call[0];
          return typeof key === 'string' && key.includes('field');
        });
        expect(pathCalls).toHaveLength(0);
      });
    });

    describe('default case', () => {
      it('should return default message for unknown error codes', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue = {
          code: 'unknown_error' as any,
          message: 'Unknown error message',
          input: {},
          path: [],
        };

        const result = errorMap(issue);

        expect(result).toEqual({ message: 'Unknown error message' });
      });

      it('should return "Invalid input" when message is missing', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue = {
          code: 'unknown_error' as any,
          message: undefined as any,
          input: {},
          path: [],
        };

        const result = errorMap(issue);

        expect(result).toEqual({ message: 'Invalid input' });
      });
    });

    describe('edge cases', () => {
      it('should handle issue without expected field', () => {
        const errorMap = makeZodI18nMap();
        const issue = {
          code: 'invalid_type' as any,
          message: 'Invalid type',
          input: 'test',
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.invalid_type', {
          expected: 'unknown',
          received: expect.any(String),
          ns: 'zod',
          defaultValue: 'Invalid type',
        });
      });

      it('should handle issue with missing optional fields', () => {
        const errorMap = makeZodI18nMap();
        const issue = {
          code: 'unrecognized_keys' as any,
          message: 'Unrecognized keys',
          input: {},
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('errors.unrecognized_keys', {
          keys: '',
          count: 0,
          ns: 'zod',
          defaultValue: 'Unrecognized keys',
        });
      });

      it('should handle issue with Map input', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue = {
          code: 'invalid_type',
          message: 'Invalid type',
          input: new Map(),
          expected: 'string',
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('types.map', {
          defaultValue: 'map',
          ns: 'zod',
        });
      });

      it('should handle issue with Set input', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue = {
          code: 'invalid_type',
          message: 'Invalid type',
          input: new Set(),
          expected: 'string',
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('types.set', {
          defaultValue: 'set',
          ns: 'zod',
        });
      });

      it('should handle issue with function input', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue = {
          code: 'invalid_type',
          message: 'Invalid type',
          input: () => {},
          expected: 'string',
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('types.function', {
          defaultValue: 'function',
          ns: 'zod',
        });
      });

      it('should handle issue with symbol input', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue = {
          code: 'invalid_type',
          message: 'Invalid type',
          input: Symbol('test'),
          expected: 'string',
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('types.symbol', {
          defaultValue: 'symbol',
          ns: 'zod',
        });
      });

      it('should handle issue with bigint input', () => {
        const errorMap = makeZodI18nMap();
        const issue: $ZodRawIssue = {
          code: 'invalid_type',
          message: 'Invalid type',
          input: BigInt(123),
          expected: 'string',
          path: [],
        };

        errorMap(issue);

        expect(mockT).toHaveBeenCalledWith('types.bigint', {
          defaultValue: 'bigint',
          ns: 'zod',
        });
      });
    });
  });
});

