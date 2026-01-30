import type { Request } from 'express';
import type { TFunction } from 'i18next';

import {
  getCustomErrorTranslations,
  getFormData,
  getTranslation,
  getTranslationErrors,
  processFieldData,
  setFormData,
  validateForm,
} from '../../../../main/modules/steps';
import { getErrorMessage } from '../../../../main/modules/steps/formBuilder/errorUtils';

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
      expect(getErrorMessage(result.dateField)).toBe('Enter a valid date');
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
      expect(getErrorMessage(result.dateField)).toBe('Enter a valid date');
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
      expect(getErrorMessage(result.dateField)).toBe('Enter a valid date');
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

      const result = validateForm(req, fields);
      expect(getErrorMessage(result.dateField)).toBe('Enter a valid date');
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

      const result = validateForm(req, fields);
      expect(getErrorMessage(result.dateField)).toBe('Enter a valid date');
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
        expect(getErrorMessage(result.dateField)).toBe('Enter a valid date');
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

        const mockT = ((key: string) => {
          if (key === 'errors.date.required') {
            return 'Enter your date of birth';
          }
          return key;
        }) as TFunction;

        const result = validateForm(req, fields, {}, undefined, mockT);
        expect(result).toHaveProperty('dateOfBirth');
        expect(getErrorMessage(result.dateOfBirth)).toBe('Enter your date of birth');
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

        const result = validateForm(req, fields);
        expect(result).toHaveProperty('dateField');
        expect(getErrorMessage(result.dateField)).toBe('Enter a valid date');
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

        const result = validateForm(req, fields);
        expect(result).toHaveProperty('dateField');
        expect(getErrorMessage(result.dateField)).toBe('Enter a valid date');
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

        const result = validateForm(req, fields);
        expect(result).toHaveProperty('dateField');
        expect(getErrorMessage(result.dateField)).toBe('Enter a valid date');
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

        const result = validateForm(req, fields);
        expect(result).toHaveProperty('dateField');
        expect(getErrorMessage(result.dateField)).toBe('Enter a valid date');
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

        const result = validateForm(req, fields);
        expect(result).toHaveProperty('dateField');
        expect(getErrorMessage(result.dateField)).toBe('Enter a valid date');
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

        const result = validateForm(req, fields);
        expect(result).toHaveProperty('dateField');
        expect(getErrorMessage(result.dateField)).toBe('Enter a valid date');
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

        const result = validateForm(req, fields);
        expect(result).toHaveProperty('dateOfBirth');
        expect(getErrorMessage(result.dateOfBirth)).toBe('Enter a valid date');
      });

      it('should use fallback message when dateMissingTwo translation is not provided', () => {
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

        const result = validateForm(req, fields, {});
        expect(result).toHaveProperty('dateField');
        expect(getErrorMessage(result.dateField)).toBe('Enter a valid date');
      });

      it('should use fallback message when single missing part translation is not provided', () => {
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

        const result = validateForm(req, fields, {});
        expect(result).toHaveProperty('dateField');
        expect(getErrorMessage(result.dateField)).toBe('Enter a valid date');
      });
    });

    describe('date field future date validation', () => {
      it('should return error when date is in the future and noFutureDate is true', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const req = {
          body: {
            'dateField-day': tomorrow.getDate().toString().padStart(2, '0'),
            'dateField-month': (tomorrow.getMonth() + 1).toString().padStart(2, '0'),
            'dateField-year': tomorrow.getFullYear().toString(),
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'dateField',
            type: 'date' as const,
            required: true,
            noFutureDate: true,
          },
        ];

        const mockT = ((key: string) => {
          if (key === 'errors.date.futureDate') {
            return 'Date must be in the past';
          }
          return key;
        }) as TFunction;

        const result = validateForm(req, fields, {}, undefined, mockT);
        expect(result).toHaveProperty('dateField');
        expect(getErrorMessage(result.dateField)).toBe('Date must be in the past');
      });

      it('should return error when date is today and noFutureDate is true', () => {
        const today = new Date();

        const req = {
          body: {
            'dateField-day': today.getDate().toString().padStart(2, '0'),
            'dateField-month': (today.getMonth() + 1).toString().padStart(2, '0'),
            'dateField-year': today.getFullYear().toString(),
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'dateField',
            type: 'date' as const,
            required: true,
            noFutureDate: true,
          },
        ];

        const mockT = ((key: string) => {
          if (key === 'errors.date.futureDate') {
            return 'Date must be in the past';
          }
          return key;
        }) as TFunction;

        const result = validateForm(req, fields, {}, undefined, mockT);
        expect(result).toHaveProperty('dateField');
        expect(getErrorMessage(result.dateField)).toBe('Date must be in the past');
      });

      it('should allow past date when noFutureDate is true', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const req = {
          body: {
            'dateField-day': yesterday.getDate().toString().padStart(2, '0'),
            'dateField-month': (yesterday.getMonth() + 1).toString().padStart(2, '0'),
            'dateField-year': yesterday.getFullYear().toString(),
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'dateField',
            type: 'date' as const,
            required: true,
            noFutureDate: true,
          },
        ];

        const result = validateForm(req, fields);
        expect(result).not.toHaveProperty('dateField');
      });

      it('should allow future date when noFutureDate is false or undefined', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const req = {
          body: {
            'dateField-day': tomorrow.getDate().toString().padStart(2, '0'),
            'dateField-month': (tomorrow.getMonth() + 1).toString().padStart(2, '0'),
            'dateField-year': tomorrow.getFullYear().toString(),
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'dateField',
            type: 'date' as const,
            required: true,
            noFutureDate: false,
          },
        ];

        const result = validateForm(req, fields);
        expect(result).not.toHaveProperty('dateField');
      });

      it('should use step-specific error message for future date', () => {
        const today = new Date();

        const req = {
          body: {
            'dateOfBirth-day': today.getDate().toString().padStart(2, '0'),
            'dateOfBirth-month': (today.getMonth() + 1).toString().padStart(2, '0'),
            'dateOfBirth-year': today.getFullYear().toString(),
          },
          session: {},
        } as unknown as Request;

        const fields = [
          {
            name: 'dateOfBirth',
            type: 'date' as const,
            required: true,
            noFutureDate: true,
          },
        ];

        const mockT = ((key: string) => {
          if (key === 'errors.dateOfBirth.futureDate') {
            return 'Your date of birth must be in the past';
          }
          if (key === 'errors.date.futureDate') {
            return 'Date must be in the past';
          }
          return key;
        }) as TFunction;

        const stepSpecificErrors = getCustomErrorTranslations(mockT, fields);
        const translations = { ...stepSpecificErrors };

        const result = validateForm(req, fields, translations, undefined, mockT);
        expect(result).toHaveProperty('dateOfBirth');
        expect(getErrorMessage(result.dateOfBirth)).toBe('Your date of birth must be in the past');
      });
    });

    describe('date field format validation', () => {
      it('should return error for non-numeric day', () => {
        const req = {
          body: {
            'dateField-day': 'ab',
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
        expect(getErrorMessage(result.dateField)).toBe('Enter a valid date');
      });

      it('should return error for day with leading zero when not allowed', () => {
        const req = {
          body: {
            'dateField-day': '05',
            'dateField-month': '06',
            'dateField-year': '0200',
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
        expect(getErrorMessage(result.dateField)).toBe('Enter a valid date');
      });

      it('should return error for year with leading zero', () => {
        const req = {
          body: {
            'dateField-day': '15',
            'dateField-month': '06',
            'dateField-year': '0200',
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
        expect(getErrorMessage(result.dateField)).toBe('Enter a valid date');
      });

      it('should return error for day exceeding max length', () => {
        const req = {
          body: {
            'dateField-day': '123',
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
        expect(getErrorMessage(result.dateField)).toBe('Enter a valid date');
      });

      it('should return error for month exceeding max length', () => {
        const req = {
          body: {
            'dateField-day': '15',
            'dateField-month': '123',
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
        expect(getErrorMessage(result.dateField)).toBe('Enter a valid date');
      });

      it('should return error for year exceeding max length', () => {
        const req = {
          body: {
            'dateField-day': '15',
            'dateField-month': '06',
            'dateField-year': '20000',
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
        expect(getErrorMessage(result.dateField)).toBe('Enter a valid date');
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
        expect(getErrorMessage(result.dateField)).toBe('Enter a valid date');
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
        expect(getErrorMessage(result.dateField)).toBe('Enter a valid date');
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
        expect(getErrorMessage(result.dateField)).toBe('Year must be 2000 or later');
      });

      it('should handle custom validation for date field', () => {
        const req = {
          body: {
            'dateOfBirth-day': '15',
            'dateOfBirth-month': '06',
            'dateOfBirth-year': '2010',
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
              if (dateValue.year === '2010') {
                return 'errors.dateOfBirth.custom';
              }
              return undefined;
            },
          },
        ];

        const translations = {
          'dateOfBirth.custom': 'Custom validation error',
        };

        const result = validateForm(req, fields, translations);
        expect(result).toHaveProperty('dateOfBirth');
        expect(getErrorMessage(result.dateOfBirth)).toBe('Custom validation error');
      });
    });
  });

  describe('getTranslation', () => {
    it('should return translation when found', () => {
      const mockT = ((key: string) => {
        if (key === 'test.key') {
          return 'Translated text';
        }
        return key;
      }) as TFunction;

      const result = getTranslation(mockT, 'test.key');
      expect(result).toBe('Translated text');
    });

    it('should return fallback when translation not found', () => {
      const mockT = ((key: string) => key) as TFunction;

      const result = getTranslation(mockT, 'test.key', 'Fallback text');
      expect(result).toBe('Fallback text');
    });

    it('should return undefined when translation not found and no fallback', () => {
      const mockT = ((key: string) => key) as TFunction;

      const result = getTranslation(mockT, 'test.key');
      expect(result).toBeUndefined();
    });
  });

  describe('processFieldData', () => {
    it('should process checkbox field from string to array', () => {
      const req = {
        body: {
          checkboxField: 'value1',
        },
      } as unknown as Request;

      const fields = [
        {
          name: 'checkboxField',
          type: 'checkbox' as const,
        },
      ];

      processFieldData(req, fields);
      expect(req.body.checkboxField).toEqual(['value1']);
    });

    it('should process date field from separate parts to object', () => {
      const req = {
        body: {
          'dateField-day': '15',
          'dateField-month': '06',
          'dateField-year': '2000',
        },
      } as unknown as Request;

      const fields = [
        {
          name: 'dateField',
          type: 'date' as const,
        },
      ];

      processFieldData(req, fields);
      expect(req.body.dateField).toEqual({ day: '15', month: '06', year: '2000' });
      expect(req.body['dateField-day']).toBeUndefined();
      expect(req.body['dateField-month']).toBeUndefined();
      expect(req.body['dateField-year']).toBeUndefined();
    });

    it('should handle empty date field parts', () => {
      const req = {
        body: {
          'dateField-day': '',
          'dateField-month': '  ',
          'dateField-year': '',
        },
      } as unknown as Request;

      const fields = [
        {
          name: 'dateField',
          type: 'date' as const,
        },
      ];

      processFieldData(req, fields);
      expect(req.body.dateField).toEqual({ day: '', month: '', year: '' });
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

    it('should handle errorMessage property on field', () => {
      const mockT = ((key: string) => {
        if (key === 'errors.customError') {
          return 'Custom error from property';
        }
        return key;
      }) as TFunction;

      const fields = [
        {
          name: 'testField',
          type: 'text' as const,
          errorMessage: 'errors.customError',
        },
      ];

      const result = getTranslationErrors(mockT, fields);
      expect(result).toEqual({ testField: 'Custom error from property' });
    });

    it('should handle subFields with errorMessage', () => {
      const mockT = ((key: string) => {
        if (key === 'errors.emailAddress') {
          return 'Email address error';
        }
        return key;
      }) as TFunction;

      const fields = [
        {
          name: 'contactMethod',
          type: 'radio' as const,
          options: [
            {
              value: 'email',
              subFields: {
                emailAddress: {
                  name: 'emailAddress',
                  type: 'text' as const,
                  errorMessage: 'errors.emailAddress',
                },
              },
            },
          ],
        },
      ];

      const result = getTranslationErrors(mockT, fields);
      expect(result).toEqual({ 'contactMethod.emailAddress': 'Email address error' });
    });

    it('should handle nested subFields recursively', () => {
      const mockT = ((key: string) => {
        if (key === 'errors.nestedField') {
          return 'Nested field error';
        }
        return key;
      }) as TFunction;

      const fields = [
        {
          name: 'parent',
          type: 'radio' as const,
          options: [
            {
              value: 'option1',
              subFields: {
                child: {
                  name: 'child',
                  type: 'radio' as const,
                  options: [
                    {
                      value: 'nested',
                      subFields: {
                        nestedField: {
                          name: 'nestedField',
                          type: 'text' as const,
                          errorMessage: 'errors.nestedField',
                        },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      ];

      const result = getTranslationErrors(mockT, fields);
      // The function uses field.name (not nested name) as parent, so nestedField under child becomes child.nestedField
      expect(result).toEqual({ 'child.nestedField': 'Nested field error' });
    });

    it('should not add translation when errorMessage does not start with errors.', () => {
      const mockT = ((key: string) => key) as TFunction;

      const fields = [
        {
          name: 'testField',
          type: 'text' as const,
          errorMessage: 'custom.error', // Doesn't start with 'errors.'
        },
      ];

      const result = getTranslationErrors(mockT, fields);
      expect(result).toEqual({});
    });

    it('should prioritize errorMessage property over field name translation', () => {
      const mockT = ((key: string) => {
        if (key === 'errors.testField') {
          return 'Field name translation';
        }
        if (key === 'errors.customError') {
          return 'Custom error message';
        }
        return key;
      }) as TFunction;

      const fields = [
        {
          name: 'testField',
          type: 'text' as const,
          errorMessage: 'errors.customError',
        },
      ];

      const result = getTranslationErrors(mockT, fields);
      // errorMessage property should take precedence
      expect(result).toEqual({ testField: 'Custom error message' });
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
        if (key === 'errors.dateOfBirth.missingOne') {
          return 'Your date of birth must include a {{missingField}}';
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
        dateMissingOne: 'Your date of birth must include a {{missingField}}',
        'dateOfBirth.required': 'Enter your date of birth',
        'dateOfBirth.missingOne': 'Your date of birth must include a {{missingField}}',
      });
    });

    it('should return custom error translations', () => {
      const mockT = ((key: string) => {
        if (key === 'errors.dateOfBirth.custom') {
          return 'Custom validation error';
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
        'dateOfBirth.custom': 'Custom validation error',
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

    it('should handle missingTwo translation key', () => {
      const mockT = ((key: string) => {
        if (key === 'errors.dateOfBirth.missingTwo') {
          return 'Your date of birth must include two parts';
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
        dateMissingTwo: 'Your date of birth must include two parts',
        'dateOfBirth.missingTwo': 'Your date of birth must include two parts',
      });
    });

    it('should handle futureDate translation key for date fields', () => {
      const mockT = ((key: string) => {
        if (key === 'errors.dateOfBirth.futureDate') {
          return 'Your date of birth must be in the past';
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
        dateFutureDate: 'Your date of birth must be in the past',
        'dateOfBirth.futureDate': 'Your date of birth must be in the past',
      });
    });

    it('should not add date key for non-date fields', () => {
      const mockT = ((key: string) => {
        if (key === 'errors.textField.required') {
          return 'Text field is required';
        }
        return key;
      }) as TFunction;

      const fields = [
        {
          name: 'textField',
          type: 'text' as const,
        },
      ];

      const result = getCustomErrorTranslations(mockT, fields);
      expect(result).toEqual({
        'textField.required': 'Text field is required',
      });
    });

    it('should handle nested keys that do not map to date keys', () => {
      const mockT = ((key: string) => {
        if (key === 'errors.dateOfBirth.unknownKey') {
          return 'Unknown error';
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
      // unknownKey doesn't map to a date key, so it won't be in result
      expect(result).toEqual({});
    });

    it('should handle non-date field custom errors', () => {
      const mockT = ((key: string) => {
        if (key === 'errors.textField.required') {
          return 'Text field is required';
        }
        return key;
      }) as TFunction;

      const fields = [
        {
          name: 'textField',
          type: 'text' as const,
        },
      ];

      const result = getCustomErrorTranslations(mockT, fields);
      expect(result).toEqual({
        'textField.required': 'Text field is required',
      });
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
  });
});
