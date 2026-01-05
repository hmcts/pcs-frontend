import type { Request } from 'express';
import type { TFunction } from 'i18next';

import {
  getCustomErrorTranslations,
  getFormData,
  getTranslationErrors,
  setFormData,
  validateForm,
} from '../../../../main/modules/steps';

describe('formHelpers', () => {
  describe('getFormData', () => {
    it('should return form data from session when available', () => {
      const req = {
        session: {
          formData: {
            'test-step': {
              field1: 'value1',
              field2: 'value2',
            },
          },
        },
      } as unknown as Request;

      const result = getFormData(req, 'test-step');
      expect(result).toEqual({
        field1: 'value1',
        field2: 'value2',
      });
    });

    it('should return empty object when step data not in session', () => {
      const req = {
        session: {
          formData: {},
        },
      } as unknown as Request;

      const result = getFormData(req, 'test-step');
      expect(result).toEqual({});
    });

    it('should return empty object when formData not in session', () => {
      const req = {
        session: {},
      } as unknown as Request;

      const result = getFormData(req, 'test-step');
      expect(result).toEqual({});
    });
  });

  describe('setFormData', () => {
    it('should set form data in session', () => {
      const req = {
        session: {},
      } as unknown as Request;

      setFormData(req, 'test-step', { field1: 'value1' });

      const session = req.session as { formData?: Record<string, unknown> };
      expect(session.formData).toEqual({
        'test-step': {
          field1: 'value1',
        },
      });
    });

    it('should update existing form data', () => {
      const req = {
        session: {
          formData: {
            'test-step': {
              field1: 'old-value',
            },
          },
        },
      } as unknown as Request;

      setFormData(req, 'test-step', { field1: 'new-value', field2: 'value2' });

      const session = req.session as { formData?: Record<string, unknown> };
      expect(session.formData).toEqual({
        'test-step': {
          field1: 'new-value',
          field2: 'value2',
        },
      });
    });

    it('should create formData object if it does not exist', () => {
      const req = {
        session: {},
      } as unknown as Request;

      setFormData(req, 'test-step', { field1: 'value1' });

      const session = req.session as { formData?: Record<string, unknown> };
      expect(session.formData).toBeDefined();
      expect(session.formData?.['test-step']).toEqual({ field1: 'value1' });
    });
  });

  describe('validateForm', () => {
    it('should return no errors when all required fields are provided', () => {
      const req = {
        body: {
          field1: 'value1',
          field2: 'value2',
        },
        session: {},
      } as unknown as Request;

      const fields = [
        { name: 'field1', type: 'text' as const, required: true },
        { name: 'field2', type: 'text' as const, required: true },
      ];

      const result = validateForm(req, fields);
      expect(result).toEqual({});
    });

    it('should return error for missing required field', () => {
      const req = {
        body: {
          field1: 'value1',
        },
        session: {},
      } as unknown as Request;

      const fields = [
        { name: 'field1', type: 'text' as const, required: true },
        { name: 'field2', type: 'text' as const, required: true },
      ];

      const result = validateForm(req, fields);
      expect(result).toHaveProperty('field2');
      expect(result.field2).toBe('This field is required');
    });

    it('should use custom error message when provided', () => {
      const req = {
        body: {},
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'text' as const,
          required: true,
          errorMessage: 'Custom error message',
        },
      ];

      const result = validateForm(req, fields);
      expect(result.field1).toBe('Custom error message');
    });

    it('should use translation error message when provided', () => {
      const req = {
        body: {},
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'text' as const,
          required: true,
        },
      ];

      const translations = {
        defaultRequired: 'Translation error message',
      };

      const result = validateForm(req, fields, translations);
      expect(result.field1).toBe('Translation error message');
    });

    it('should validate pattern when field has pattern', () => {
      const req = {
        body: {
          field1: 'invalid-email',
        },
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'text' as const,
          required: false,
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toHaveProperty('field1');
      expect(result.field1).toBe('Invalid format');
    });

    it('should not validate pattern for empty fields', () => {
      const req = {
        body: {
          field1: '',
        },
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'text' as const,
          required: false,
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toEqual({});
    });

    it('should validate checkbox field - empty array', () => {
      const req = {
        body: {
          field1: [],
        },
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'checkbox' as const,
          required: true,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toHaveProperty('field1');
    });

    it('should validate checkbox field - empty string', () => {
      const req = {
        body: {
          field1: '',
        },
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'checkbox' as const,
          required: true,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toHaveProperty('field1');
    });

    it('should pass validation for checkbox with values', () => {
      const req = {
        body: {
          field1: ['value1', 'value2'],
        },
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'checkbox' as const,
          required: true,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toEqual({});
    });

    it('should handle undefined values', () => {
      const req = {
        body: {
          field1: undefined,
        },
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'text' as const,
          required: true,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toHaveProperty('field1');
    });

    it('should handle null values', () => {
      const req = {
        body: {
          field1: null,
        },
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'text' as const,
          required: true,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toHaveProperty('field1');
    });

    it('should use custom error message for pattern validation', () => {
      const req = {
        body: {
          field1: 'invalid',
        },
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'text' as const,
          required: false,
          pattern: '^valid$',
          errorMessage: 'Custom pattern error',
        },
      ];

      const result = validateForm(req, fields);
      expect(result.field1).toBe('Custom pattern error');
    });

    it('should use translation error message for pattern validation', () => {
      const req = {
        body: {
          field1: 'invalid',
        },
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'text' as const,
          required: false,
          pattern: '^valid$',
        },
      ];

      const translations = {
        defaultInvalid: 'Translation pattern error',
      };

      const result = validateForm(req, fields, translations);
      expect(result.field1).toBe('Translation pattern error');
    });

    it('should validate maxLength for text fields', () => {
      const req = {
        body: {
          field1: 'a'.repeat(101),
        },
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'text' as const,
          required: false,
          maxLength: 100,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toHaveProperty('field1');
      expect(result.field1).toBe('Must be 100 characters or fewer');
    });

    it('should use translation for maxLength error', () => {
      const req = {
        body: {
          field1: 'a'.repeat(101),
        },
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'text' as const,
          required: false,
          maxLength: 100,
        },
      ];

      const translations = {
        defaultMaxLength: 'Must be {max} characters or fewer',
      };

      const result = validateForm(req, fields, translations);
      expect(result.field1).toBe('Must be 100 characters or fewer');
    });

    it('should not validate maxLength for empty fields', () => {
      const req = {
        body: {
          field1: '',
        },
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'text' as const,
          required: false,
          maxLength: 10,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toEqual({});
    });

    it('should validate date fields - missing day', () => {
      const req = {
        body: {
          'dateField-day': '',
          'dateField-month': '02',
          'dateField-year': '2023',
        },
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'dateField',
          type: 'date' as const,
          required: true,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toHaveProperty('dateField');
      expect(result.dateField).toBe('Date must include a day');
    });

    it('should validate date fields - missing month', () => {
      const req = {
        body: {
          'dateField-day': '01',
          'dateField-month': '',
          'dateField-year': '2023',
        },
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'dateField',
          type: 'date' as const,
          required: true,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toHaveProperty('dateField');
    });

    it('should validate date fields - missing year', () => {
      const req = {
        body: {
          'dateField-day': '01',
          'dateField-month': '02',
          'dateField-year': '',
        },
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'dateField',
          type: 'date' as const,
          required: true,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toHaveProperty('dateField');
    });

    it('should validate date fields - non-numeric values', () => {
      const req = {
        body: {
          'dateField-day': 'ab',
          'dateField-month': 'cd',
          'dateField-year': 'ef',
        },
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'dateField',
          type: 'date' as const,
          required: true,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toHaveProperty('dateField');
      expect(result.dateField).toBe('Enter a valid date');
    });

    it('should validate date fields - invalid day range', () => {
      const req = {
        body: {
          'dateField-day': '32',
          'dateField-month': '01',
          'dateField-year': '2023',
        },
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'dateField',
          type: 'date' as const,
          required: true,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toHaveProperty('dateField');
      expect(result.dateField).toBe('Enter a valid date');
    });

    it('should validate date fields - invalid month range', () => {
      const req = {
        body: {
          'dateField-day': '01',
          'dateField-month': '13',
          'dateField-year': '2023',
        },
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'dateField',
          type: 'date' as const,
          required: true,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toHaveProperty('dateField');
    });

    it('should validate date fields - year too old (valid)', () => {
      const req = {
        body: {
          'dateField-day': '01',
          'dateField-month': '01',
          'dateField-year': '1899',
        },
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'dateField',
          type: 'date' as const,
          required: true,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toEqual({});
    });

    it('should validate date fields - year in future (valid)', () => {
      const futureYear = new Date().getFullYear() + 1;
      const req = {
        body: {
          'dateField-day': '01',
          'dateField-month': '01',
          'dateField-year': futureYear.toString(),
        },
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'dateField',
          type: 'date' as const,
          required: true,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toEqual({});
    });

    it('should pass validation for valid date', () => {
      const req = {
        body: {
          'dateField-day': '15',
          'dateField-month': '06',
          'dateField-year': '2000',
        },
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'dateField',
          type: 'date' as const,
          required: true,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toEqual({});
    });

    it('should not validate date fields when not required', () => {
      const req = {
        body: {
          'dateField-day': '',
          'dateField-month': '',
          'dateField-year': '',
        },
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'dateField',
          type: 'date' as const,
          required: false,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toEqual({});
    });

    it('should prioritize validation error over custom errorMessage for date fields', () => {
      const req = {
        body: {
          'dateField-day': '',
          'dateField-month': '02',
          'dateField-year': '2023',
        },
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'dateField',
          type: 'date' as const,
          required: true,
          errorMessage: 'Custom date error',
        },
      ];

      const translations = {
        dateMissingDay: 'Date must include a day',
      };

      const result = validateForm(req, fields, translations);
      expect(result.dateField).toBe('Date must include a day');
    });

    it('should use translation error message for date validation', () => {
      const req = {
        body: {
          'dateField-day': '',
          'dateField-month': '02',
          'dateField-year': '2023',
        },
        session: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'dateField',
          type: 'date' as const,
          required: true,
        },
      ];

      const translations = {
        dateMissingDay: 'Date must include a day',
      };

      const result = validateForm(req, fields, translations);
      expect(result.dateField).toBe('Date must include a day');
    });

    describe('function-based required validation', () => {
      it('should evaluate required function returning true', () => {
        const req = {
          body: {
            field1: 'value1',
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'field1',
            type: 'text' as const,
            required: true,
          },
          {
            name: 'field2',
            type: 'text' as const,
            required: () => true,
          },
        ];

        const result = validateForm(req, fields);
        expect(result).toHaveProperty('field2');
        expect(result.field2).toBe('This field is required');
      });

      it('should evaluate required function returning false', () => {
        const req = {
          body: {
            field1: 'value1',
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'field1',
            type: 'text' as const,
            required: () => false,
          },
        ];

        const result = validateForm(req, fields);
        expect(result).toEqual({});
      });

      it('should pass formData to required function', () => {
        const req = {
          body: {
            field1: 'value1',
            field2: 'value2',
          },
          session: {},
        } as unknown as Request;

        const requiredFn = jest.fn((formData: Record<string, unknown>) => {
          return formData.field1 === 'value1';
        });

        const fields = [
          {
            name: 'field2',
            type: 'text' as const,
            required: requiredFn,
          },
        ];

        validateForm(req, fields);
        expect(requiredFn).toHaveBeenCalledWith(
          expect.objectContaining({ field1: 'value1', field2: 'value2' }),
          expect.objectContaining({ field1: 'value1', field2: 'value2' })
        );
      });

      it('should pass allFormData to required function', () => {
        const req = {
          body: {
            field1: 'value1',
          },
          session: {
            formData: {
              step1: { previousField: 'previousValue' },
              step2: { anotherField: 'anotherValue' },
            },
          },
        } as unknown as Request;

        const requiredFn = jest.fn((formData: Record<string, unknown>, allData: Record<string, unknown>) => {
          return allData.previousField === 'previousValue';
        });

        const fields = [
          {
            name: 'field1',
            type: 'text' as const,
            required: requiredFn,
          },
        ];

        validateForm(req, fields);
        expect(requiredFn).toHaveBeenCalledWith(
          expect.objectContaining({ field1: 'value1' }),
          expect.objectContaining({ previousField: 'previousValue', anotherField: 'anotherValue', field1: 'value1' })
        );
      });

      it('should handle required function throwing errors', () => {
        const req = {
          body: {
            field1: 'value1',
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'field1',
            type: 'text' as const,
            required: () => {
              throw new Error('Test error');
            },
          },
        ];

        const result = validateForm(req, fields);
        // Should default to false (not required) when function throws
        expect(result).toEqual({});
      });

      it('should use allFormData parameter when provided', () => {
        const req = {
          body: {
            field1: 'value1',
          },
          session: {},
        } as unknown as Request;

        const allFormData = { customData: 'customValue' };

        const requiredFn = jest.fn((formData: Record<string, unknown>, allData: Record<string, unknown>) => {
          return allData.customData === 'customValue';
        });

        const fields = [
          {
            name: 'field2',
            type: 'text' as const,
            required: requiredFn,
          },
        ];

        validateForm(req, fields, undefined, allFormData);
        expect(requiredFn).toHaveBeenCalledWith(
          expect.objectContaining({ field1: 'value1' }),
          expect.objectContaining({ customData: 'customValue', field1: 'value1' })
        );
      });
    });

    describe('validate function (cross-field validation)', () => {
      it('should run validate function and return error message', () => {
        const req = {
          body: {
            field1: 'value1',
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'field1',
            type: 'text' as const,
            required: false,
            validate: (value: unknown) => {
              if (value === 'value1') {
                return 'Custom validation error';
              }
              return undefined;
            },
          },
        ];

        const result = validateForm(req, fields);
        expect(result).toHaveProperty('field1');
        expect(result.field1).toBe('Custom validation error');
      });

      it('should run validate function returning undefined for valid value', () => {
        const req = {
          body: {
            field1: 'validValue',
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'field1',
            type: 'text' as const,
            required: false,
            validate: (value: unknown) => {
              if (value === 'validValue') {
                return undefined;
              }
              return 'Invalid';
            },
          },
        ];

        const result = validateForm(req, fields);
        expect(result).toEqual({});
      });

      it('should pass formData and allData to validate function', () => {
        const req = {
          body: {
            field1: 'value1',
            field2: 'value2',
          },
          session: {
            formData: {
              step1: { previousField: 'previousValue' },
            },
          },
        } as unknown as Request;

        const validateFn = jest.fn(
          (value: unknown, formData: Record<string, unknown>, allData: Record<string, unknown>) => {
            return formData.field2 === 'value2' && allData.previousField === 'previousValue' ? undefined : 'Error';
          }
        );

        const fields = [
          {
            name: 'field1',
            type: 'text' as const,
            required: false,
            validate: validateFn,
          },
        ];

        validateForm(req, fields);
        expect(validateFn).toHaveBeenCalledWith(
          'value1',
          expect.objectContaining({ field1: 'value1', field2: 'value2' }),
          expect.objectContaining({ previousField: 'previousValue', field1: 'value1', field2: 'value2' })
        );
      });

      it('should handle validate function throwing errors', () => {
        const req = {
          body: {
            field1: 'value1',
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'field1',
            type: 'text' as const,
            required: false,
            validate: () => {
              throw new Error('Test error');
            },
          },
        ];

        const result = validateForm(req, fields);
        // Should not add error when function throws
        expect(result).toEqual({});
      });

      it('should run validate function even for empty values when field is not required', () => {
        const req = {
          body: {
            field1: '',
            field2: 'value2',
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'field1',
            type: 'text' as const,
            required: false,
            validate: (value: unknown, formData: Record<string, unknown>) => {
              if (!value && formData.field2) {
                return 'Field1 is required when field2 is set';
              }
              return undefined;
            },
          },
        ];

        const result = validateForm(req, fields);
        expect(result).toHaveProperty('field1');
        expect(result.field1).toBe('Field1 is required when field2 is set');
      });
    });

    describe('multiple errors', () => {
      it('should collect errors from multiple fields', () => {
        const req = {
          body: {
            field1: 'value1',
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'field1',
            type: 'text' as const,
            required: true,
          },
          {
            name: 'field2',
            type: 'text' as const,
            required: true,
          },
          {
            name: 'field3',
            type: 'text' as const,
            required: true,
          },
        ];

        const result = validateForm(req, fields);
        expect(result).toHaveProperty('field2');
        expect(result).toHaveProperty('field3');
        expect(Object.keys(result)).toHaveLength(2);
      });

      it('should collect multiple validation errors on same field', () => {
        const req = {
          body: {
            field1: 'a'.repeat(101), // Exceeds maxLength
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'field1',
            type: 'text' as const,
            required: false,
            maxLength: 100,
            pattern: '^[a-z]+$',
            validate: (value: unknown) => {
              if (typeof value === 'string' && value.length > 50) {
                return 'Custom validation error';
              }
              return undefined;
            },
          },
        ];

        const result = validateForm(req, fields);
        // Should have at least one error (maxLength or pattern or validate)
        expect(result).toHaveProperty('field1');
        // The first error encountered should be set
        expect(result.field1).toBeTruthy();
      });

      it('should collect errors from required and validate functions', () => {
        const req = {
          body: {
            field1: '', // Empty value so required function will trigger error
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'field1',
            type: 'text' as const,
            required: () => true,
          },
          {
            name: 'field2',
            type: 'text' as const,
            required: false,
            validate: () => 'Validation error',
          },
        ];

        const result = validateForm(req, fields);
        expect(result).toHaveProperty('field1');
        expect(result).toHaveProperty('field2');
        expect(result.field1).toBe('This field is required');
        expect(result.field2).toBe('Validation error');
      });
    });

    describe('date field missing parts validation', () => {
      it('should return error when all date parts are missing', () => {
        const req = {
          body: {
            'dateField-day': '',
            'dateField-month': '',
            'dateField-year': '',
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'dateField',
            type: 'date' as const,
            required: true,
          },
        ];

        const result = validateForm(req, fields);
        expect(result).toHaveProperty('dateField');
        expect(result.dateField).toBe('Enter a date');
      });

      it('should return step-specific error when all date parts are missing', () => {
        const req = {
          body: {
            'dateOfBirth-day': '',
            'dateOfBirth-month': '',
            'dateOfBirth-year': '',
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'dateOfBirth',
            type: 'date' as const,
            required: true,
          },
        ];

        const translations = {
          dateRequired: 'Enter your date of birth',
        };

        const result = validateForm(req, fields, translations);
        expect(result).toHaveProperty('dateOfBirth');
        expect(result.dateOfBirth).toBe('Enter your date of birth');
      });

      it('should return error when day is missing', () => {
        const req = {
          body: {
            'dateField-day': '',
            'dateField-month': '06',
            'dateField-year': '2000',
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'dateField',
            type: 'date' as const,
            required: true,
          },
        ];

        const translations = {
          dateMissingDay: 'Date must include a day',
        };

        const result = validateForm(req, fields, translations);
        expect(result).toHaveProperty('dateField');
        expect(result.dateField).toBe('Date must include a day');
      });

      it('should return error when month is missing', () => {
        const req = {
          body: {
            'dateField-day': '15',
            'dateField-month': '',
            'dateField-year': '2000',
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'dateField',
            type: 'date' as const,
            required: true,
          },
        ];

        const translations = {
          dateMissingMonth: 'Date must include a month',
        };

        const result = validateForm(req, fields, translations);
        expect(result).toHaveProperty('dateField');
        expect(result.dateField).toBe('Date must include a month');
      });

      it('should return error when year is missing', () => {
        const req = {
          body: {
            'dateField-day': '15',
            'dateField-month': '06',
            'dateField-year': '',
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'dateField',
            type: 'date' as const,
            required: true,
          },
        ];

        const translations = {
          dateMissingYear: 'Date must include a year',
        };

        const result = validateForm(req, fields, translations);
        expect(result).toHaveProperty('dateField');
        expect(result.dateField).toBe('Date must include a year');
      });

      it('should return error when day and month are missing', () => {
        const req = {
          body: {
            'dateField-day': '',
            'dateField-month': '',
            'dateField-year': '2000',
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'dateField',
            type: 'date' as const,
            required: true,
          },
        ];

        const translations = {
          dateMissingDayAndMonth: 'Date must include a day and month',
        };

        const result = validateForm(req, fields, translations);
        expect(result).toHaveProperty('dateField');
        expect(result.dateField).toBe('Date must include a day and month');
      });

      it('should return error when day and year are missing', () => {
        const req = {
          body: {
            'dateField-day': '',
            'dateField-month': '06',
            'dateField-year': '',
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'dateField',
            type: 'date' as const,
            required: true,
          },
        ];

        const translations = {
          dateMissingDayAndYear: 'Date must include a day and year',
        };

        const result = validateForm(req, fields, translations);
        expect(result).toHaveProperty('dateField');
        expect(result.dateField).toBe('Date must include a day and year');
      });

      it('should return error when month and year are missing', () => {
        const req = {
          body: {
            'dateField-day': '15',
            'dateField-month': '',
            'dateField-year': '',
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'dateField',
            type: 'date' as const,
            required: true,
          },
        ];

        const translations = {
          dateMissingMonthAndYear: 'Date must include a month and year',
        };

        const result = validateForm(req, fields, translations);
        expect(result).toHaveProperty('dateField');
        expect(result.dateField).toBe('Date must include a month and year');
      });

      it('should use step-specific error messages for missing parts', () => {
        const req = {
          body: {
            'dateOfBirth-day': '',
            'dateOfBirth-month': '06',
            'dateOfBirth-year': '2000',
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'dateOfBirth',
            type: 'date' as const,
            required: true,
          },
        ];

        const translations = {
          dateMissingDay: 'Your date of birth must include a day',
        };

        const result = validateForm(req, fields, translations);
        expect(result).toHaveProperty('dateOfBirth');
        expect(result.dateOfBirth).toBe('Your date of birth must include a day');
      });
    });

    describe('date field logical validation', () => {
      it('should return error for invalid date - 31st of June', () => {
        const req = {
          body: {
            'dateField-day': '31',
            'dateField-month': '06',
            'dateField-year': '2000',
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'dateField',
            type: 'date' as const,
            required: true,
          },
        ];

        const result = validateForm(req, fields);
        expect(result).toHaveProperty('dateField');
        expect(result.dateField).toBe('Enter a valid date');
      });

      it('should return error for invalid date - 29th Feb in non-leap year', () => {
        const req = {
          body: {
            'dateField-day': '29',
            'dateField-month': '02',
            'dateField-year': '2023',
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'dateField',
            type: 'date' as const,
            required: true,
          },
        ];

        const result = validateForm(req, fields);
        expect(result).toHaveProperty('dateField');
        expect(result.dateField).toBe('Enter a valid date');
      });

      it('should pass validation for valid leap year date - 29th Feb 2024', () => {
        const req = {
          body: {
            'dateField-day': '29',
            'dateField-month': '02',
            'dateField-year': '2024',
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'dateField',
            type: 'date' as const,
            required: true,
          },
        ];

        const result = validateForm(req, fields);
        expect(result).toEqual({});
      });
    });

    describe('custom date validation', () => {
      it('should use custom validate function for date fields', () => {
        const req = {
          body: {
            'dateField-day': '15',
            'dateField-month': '06',
            'dateField-year': '1999',
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'dateField',
            type: 'date' as const,
            required: true,
            validate: (value: unknown) => {
              const dateValue = value as { day: string; month: string; year: string };
              const year = parseInt(dateValue.year, 10);
              if (year < 2000) {
                return 'errors.dateField.custom';
              }
              return undefined;
            },
          },
        ];

        const translations = {
          'dateField.custom': 'Year must be 2000 or later',
        };

        const result = validateForm(req, fields, translations);
        expect(result).toHaveProperty('dateField');
        expect(result.dateField).toBe('Year must be 2000 or later');
      });

      it('should handle age restriction validation', () => {
        const today = new Date();
        const eighteenYearsAgo = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());

        const req = {
          body: {
            'dateOfBirth-day': eighteenYearsAgo.getDate().toString().padStart(2, '0'),
            'dateOfBirth-month': (eighteenYearsAgo.getMonth() + 1).toString().padStart(2, '0'),
            'dateOfBirth-year': eighteenYearsAgo.getFullYear().toString(),
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'dateOfBirth',
            type: 'date' as const,
            required: true,
            validate: (value: unknown) => {
              const dateValue = value as { day: string; month: string; year: string };
              const birthDate = new Date(
                parseInt(dateValue.year, 10),
                parseInt(dateValue.month, 10) - 1,
                parseInt(dateValue.day, 10)
              );
              const age = today.getFullYear() - birthDate.getFullYear();
              const monthDiff = today.getMonth() - birthDate.getMonth();
              const dayDiff = today.getDate() - birthDate.getDate();
              const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

              if (actualAge < 18) {
                return 'errors.dateOfBirth.custom';
              }
              return undefined;
            },
          },
        ];

        const translations = {
          'dateOfBirth.custom': 'You must be at least 18 years old',
        };

        const result = validateForm(req, fields, translations);
        expect(result).toHaveProperty('dateOfBirth');
        expect(result.dateOfBirth).toBe('You must be at least 18 years old');
      });
    });
  });

  describe('getTranslationErrors', () => {
    it('should return empty object when no translations found', () => {
      const mockT = ((key: string) => key) as TFunction;
      const fields = [
        {
          name: 'testField',
          type: 'text' as const,
        },
      ];

      const result = getTranslationErrors(mockT, fields);
      expect(result).toEqual({});
    });

    it('should return translations when found', () => {
      const mockT = ((key: string) => {
        if (key === 'errors.testField') {
          return 'Test error message';
        }
        return key;
      }) as TFunction;

      const fields = [
        {
          name: 'testField',
          type: 'text' as const,
        },
      ];

      const result = getTranslationErrors(mockT, fields);
      expect(result).toEqual({ testField: 'Test error message' });
    });
  });

  describe('getCustomErrorTranslations', () => {
    it('should return empty object when no custom errors found', () => {
      const mockT = ((key: string) => key) as TFunction;
      const fields = [
        {
          name: 'testField',
          type: 'text' as const,
        },
      ];

      const result = getCustomErrorTranslations(mockT, fields);
      expect(result).toEqual({});
    });

    it('should return step-specific date error translations', () => {
      const mockT = ((key: string) => {
        if (key === 'errors.dateOfBirth.required') {
          return 'Enter your date of birth';
        }
        if (key === 'errors.dateOfBirth.missingDay') {
          return 'Your date of birth must include a day';
        }
        return key;
      }) as TFunction;

      const fields = [
        {
          name: 'dateOfBirth',
          type: 'date' as const,
        },
      ];

      const result = getCustomErrorTranslations(mockT, fields);
      expect(result).toEqual({
        dateRequired: 'Enter your date of birth',
        dateMissingDay: 'Your date of birth must include a day',
        'dateOfBirth.required': 'Enter your date of birth',
        'dateOfBirth.missingDay': 'Your date of birth must include a day',
      });
    });

    it('should return custom error translations', () => {
      const mockT = ((key: string) => {
        if (key === 'errors.dateOfBirth.custom') {
          return 'You must be at least 18 years old';
        }
        return key;
      }) as TFunction;

      const fields = [
        {
          name: 'dateOfBirth',
          type: 'date' as const,
        },
      ];

      const result = getCustomErrorTranslations(mockT, fields);
      expect(result).toEqual({
        'dateOfBirth.custom': 'You must be at least 18 years old',
      });
    });

    it('should handle multiple fields with custom errors', () => {
      const mockT = ((key: string) => {
        if (key === 'errors.dateOfBirth.required') {
          return 'Enter your date of birth';
        }
        if (key === 'errors.startDate.required') {
          return 'Enter a start date';
        }
        return key;
      }) as TFunction;

      const fields = [
        {
          name: 'dateOfBirth',
          type: 'date' as const,
        },
        {
          name: 'startDate',
          type: 'date' as const,
        },
      ];

      const result = getCustomErrorTranslations(mockT, fields);
      expect(result).toEqual({
        dateRequired: 'Enter a start date',
        'dateOfBirth.required': 'Enter your date of birth',
        'startDate.required': 'Enter a start date',
      });
    });
  });
});
