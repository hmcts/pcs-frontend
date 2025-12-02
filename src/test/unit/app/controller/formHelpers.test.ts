import type { Request } from 'express';

import { getAllFormData, getFormData, setFormData, validateForm } from '../../../../main/app/controller/formHelpers';

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

      expect((req.session as any).formData).toEqual({
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

      expect((req.session as any).formData).toEqual({
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

      expect((req.session as any).formData).toBeDefined();
      expect((req.session as any).formData?.['test-step']).toEqual({ field1: 'value1' });
    });
  });

  describe('getAllFormData', () => {
    it('should aggregate form data from all steps', () => {
      const req = {
        session: {
          formData: {
            'step1': {
              field1: 'value1',
              field2: 'value2',
            },
            'step2': {
              field3: 'value3',
            },
          },
        },
      } as unknown as Request;

      const result = getAllFormData(req);
      expect(result).toEqual({
        field1: 'value1',
        field2: 'value2',
        field3: 'value3',
      });
    });

    it('should return empty object when no formData in session', () => {
      const req = {
        session: {},
      } as unknown as Request;

      const result = getAllFormData(req);
      expect(result).toEqual({});
    });

    it('should handle undefined session', () => {
      const req = {
        session: undefined,
      } as unknown as Request;

      const result = getAllFormData(req);
      expect(result).toEqual({});
    });

    it('should handle empty formData', () => {
      const req = {
        session: {
          formData: {},
        },
      } as unknown as Request;

      const result = getAllFormData(req);
      expect(result).toEqual({});
    });

    it('should overwrite duplicate field names with later step values', () => {
      const req = {
        session: {
          formData: {
            'step1': {
              field1: 'value1',
            },
            'step2': {
              field1: 'value2',
            },
          },
        },
      } as unknown as Request;

      const result = getAllFormData(req);
      expect(result).toEqual({
        field1: 'value2',
      });
    });
  });

  describe('validateForm', () => {
    it('should return no errors when all required fields are provided', () => {
      const req = {
        body: {
          field1: 'value1',
          field2: 'value2',
        },
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
      } as unknown as Request;

      const fields = [
        { name: 'field1', type: 'text' as const, required: true },
        { name: 'field2', type: 'text' as const, required: true },
      ];

      const result = validateForm(req, fields);
      expect(result).toHaveProperty('field2');
      expect(result.field2?.text).toBe('This field is required');
    });

    it('should use custom error message when provided', () => {
      const req = {
        body: {},
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
      expect(result.field1?.text).toBe('Custom error message');
    });

    it('should use translation error message when provided', () => {
      const req = {
        body: {},
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
      expect(result.field1?.text).toBe('Translation error message');
    });

    it('should validate pattern when field has pattern', () => {
      const req = {
        body: {
          field1: 'invalid-email',
        },
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
      expect(result.field1?.text).toBe('Invalid format');
    });

    it('should not validate pattern for empty fields', () => {
      const req = {
        body: {
          field1: '',
        },
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
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'checkbox' as const,
          required: true,
        },
      ];

      const result = validateForm(req, fields);
      expect(result.field1?.text).toBe('This field is required');
    });

    it('should validate checkbox field - empty string', () => {
      const req = {
        body: {
          field1: '',
        },
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'checkbox' as const,
          required: true,
        },
      ];

      const result = validateForm(req, fields);
      expect(result.field1?.text).toBe('This field is required');
    });

    it('should pass validation for checkbox with values', () => {
      const req = {
        body: {
          field1: ['value1', 'value2'],
        },
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
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'text' as const,
          required: true,
        },
      ];

      const result = validateForm(req, fields);
      expect(result.field1?.text).toBe('This field is required');
    });

    it('should handle null values', () => {
      const req = {
        body: {
          field1: null,
        },
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
      expect(result.field1?.text).toBe('Custom pattern error');
    });

    it('should use translation error message for pattern validation', () => {
      const req = {
        body: {
          field1: 'invalid',
        },
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
      expect(result.field1?.text).toBe('Translation pattern error');
    });

    it('should evaluate dynamic required predicates using all form data', () => {
      const req = {
        body: {
          dependantField: '',
        },
        session: {
          formData: {
            previous: {
              triggerField: 'YES',
            },
          },
        },
      } as unknown as Request;

      const fields = [
        {
          name: 'dependantField',
          type: 'text' as const,
          required: (_formData: Record<string, unknown>, allFormData: Record<string, unknown>) =>
            allFormData.triggerField === 'YES',
        },
      ];

      const result = validateForm(req, fields);
      expect(result.dependantField?.text).toBe('This field is required');
    });

    it('should support cross-field validators', () => {
      const req = {
        body: {
          email: 'person@example.com',
          confirmEmail: 'different@example.com',
        },
      } as unknown as Request;

      const fields = [
        {
          name: 'confirmEmail',
          type: 'text' as const,
          required: true,
          validator: (value: unknown, _formData: Record<string, unknown>, allFormData: Record<string, unknown>) => {
            return value === allFormData.email ? undefined : 'Email addresses must match';
          },
        },
      ];

      const result = validateForm(req, fields);
      expect(result.confirmEmail?.text).toBe('Email addresses must match');
    });

    it('should validate radio field - required with value', () => {
      const req = {
        body: {
          field1: 'option1',
        },
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'radio' as const,
          required: true,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toEqual({});
    });

    it('should validate radio field - required without value', () => {
      const req = {
        body: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'radio' as const,
          required: true,
        },
      ];

      const result = validateForm(req, fields);
      expect(result.field1?.text).toBe('This field is required');
    });

    it('should validate radio field - optional with value', () => {
      const req = {
        body: {
          field1: 'option1',
        },
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'radio' as const,
          required: false,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toEqual({});
    });

    it('should validate radio field - optional without value', () => {
      const req = {
        body: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'radio' as const,
          required: false,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toEqual({});
    });

    it('should handle radio field with null value', () => {
      const req = {
        body: {
          field1: null,
        },
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'radio' as const,
          required: true,
        },
      ];

      const result = validateForm(req, fields);
      expect(result.field1?.text).toBe('This field is required');
    });

    it('should handle checkbox field with string value', () => {
      const req = {
        body: {
          field1: 'value1',
        },
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'checkbox' as const,
          required: false,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toEqual({});
    });

    it('should handle checkbox field with null value', () => {
      const req = {
        body: {
          field1: null,
        },
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'checkbox' as const,
          required: false,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toEqual({});
    });

    it('should handle checkbox field with undefined value', () => {
      const req = {
        body: {
          field1: undefined,
        },
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'checkbox' as const,
          required: false,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toEqual({});
    });

    it('should handle checkbox field with non-array, non-string value', () => {
      const req = {
        body: {
          field1: 123,
        },
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'checkbox' as const,
          required: false,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toEqual({});
    });

    it('should handle unknown field type', () => {
      const req = {
        body: {
          field1: 'value1',
        },
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'unknown' as any,
          required: false,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toEqual({});
    });

    it('should handle required predicate that throws error', () => {
      const req = {
        body: {
          field1: 'value1',
        },
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'text' as const,
          required: () => {
            throw new Error('Predicate error');
          },
        },
      ];

      const result = validateForm(req, fields);
      // When predicate throws, it should default to false (not required)
      expect(result).toEqual({});
    });

    it('should handle custom validator returning FieldValidationError object', () => {
      const req = {
        body: {
          field1: 'value1',
        },
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'text' as const,
          required: false,
          validator: () => {
            return {
              text: 'Custom error text',
              anchor: 'custom-anchor',
            };
          },
        },
      ];

      const result = validateForm(req, fields);
      expect(result.field1?.text).toBe('Custom error text');
      expect(result.field1?.anchor).toBe('custom-anchor');
    });

    it('should handle custom validator returning FieldValidationError without anchor', () => {
      const req = {
        body: {
          field1: 'value1',
        },
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'text' as const,
          required: false,
          anchor: 'field-anchor',
          validator: () => {
            return {
              text: 'Custom error text',
            };
          },
        },
      ];

      const result = validateForm(req, fields);
      expect(result.field1?.text).toBe('Custom error text');
      expect(result.field1?.anchor).toBe('field-anchor');
    });

    it('should handle custom validator that throws error', () => {
      const req = {
        body: {
          field1: 'value1',
        },
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'text' as const,
          required: false,
          validator: () => {
            throw new Error('Validator error');
          },
        },
      ];

      const result = validateForm(req, fields);
      // When validator throws, it should be caught and not add error
      expect(result).toEqual({});
    });

    it('should validate pattern with RegExp object', () => {
      const req = {
        body: {
          field1: 'invalid',
        },
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'text' as const,
          required: false,
          pattern: /^valid$/,
        },
      ];

      const result = validateForm(req, fields);
      expect(result.field1?.text).toBe('Invalid format');
    });

    it('should validate required text field with pattern', () => {
      const req = {
        body: {
          field1: 'invalid',
        },
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'text' as const,
          required: true,
          pattern: '^valid$',
        },
      ];

      const result = validateForm(req, fields);
      expect(result.field1?.text).toBe('Invalid format');
    });

    it('should use field anchor property when provided', () => {
      const req = {
        body: {},
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'text' as const,
          required: true,
          anchor: 'custom-anchor',
        },
      ];

      const result = validateForm(req, fields);
      expect(result.field1?.anchor).toBe('custom-anchor');
    });

    it('should handle req.body being undefined', () => {
      const req = {
        body: undefined,
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'text' as const,
          required: true,
        },
      ];

      const result = validateForm(req, fields);
      expect(result.field1?.text).toBe('This field is required');
    });

    it('should trim whitespace from text field values', () => {
      const req = {
        body: {
          field1: '  value  ',
        },
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'text' as const,
          required: true,
        },
      ];

      const result = validateForm(req, fields);
      expect(result).toEqual({});
    });

    it('should handle text field with only whitespace when required', () => {
      const req = {
        body: {
          field1: '   ',
        },
      } as unknown as Request;

      const fields = [
        {
          name: 'field1',
          type: 'text' as const,
          required: true,
        },
      ];

      const result = validateForm(req, fields);
      expect(result.field1?.text).toBe('This field is required');
    });
  });
});
