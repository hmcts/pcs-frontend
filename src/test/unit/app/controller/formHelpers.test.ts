import type { Request } from 'express';

import { getFormData, setFormData, validateForm } from '../../../../main/modules/steps';

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

      expect(req.session.formData).toEqual({
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

      expect(req.session.formData).toEqual({
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

      expect(req.session.formData).toBeDefined();
      expect(req.session.formData?.['test-step']).toEqual({ field1: 'value1' });
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
      expect(result.field2).toBe('This field is required');
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
      expect(result.field1).toBe('Custom error message');
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
      expect(result.field1).toBe('Translation error message');
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
      expect(result).toHaveProperty('field1');
      expect(result.field1).toBe('Invalid format');
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
      expect(result).toHaveProperty('field1');
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
      expect(result).toHaveProperty('field1');
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
      expect(result).toHaveProperty('field1');
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
      expect(result.field1).toBe('Custom pattern error');
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
      expect(result.field1).toBe('Translation pattern error');
    });

    it('should validate maxLength for text fields', () => {
      const req = {
        body: {
          field1: 'a'.repeat(101),
        },
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

    it('should validate date fields - missing month', () => {
      const req = {
        body: {
          'dateField-day': '01',
          'dateField-month': '',
          'dateField-year': '2023',
        },
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

    it('should validate date fields - year too old', () => {
      const req = {
        body: {
          'dateField-day': '01',
          'dateField-month': '01',
          'dateField-year': '1899',
        },
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

    it('should validate date fields - year in future', () => {
      const futureYear = new Date().getFullYear() + 1;
      const req = {
        body: {
          'dateField-day': '01',
          'dateField-month': '01',
          'dateField-year': futureYear.toString(),
        },
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

    it('should pass validation for valid date', () => {
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

    it('should use custom error message for date validation', () => {
      const req = {
        body: {
          'dateField-day': '',
          'dateField-month': '02',
          'dateField-year': '2023',
        },
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
      expect(result.dateField).toBe('Custom date error');
    });

    it('should use translation error message for date validation', () => {
      const req = {
        body: {
          'dateField-day': '',
          'dateField-month': '02',
          'dateField-year': '2023',
        },
      } as unknown as Request;

      const fields = [
        {
          name: 'dateField',
          type: 'date' as const,
          required: true,
        },
      ];

      const translations = {
        defaultRequired: 'Translation date error',
      };

      const result = validateForm(req, fields, translations);
      expect(result.dateField).toBe('Translation date error');
    });
  });
});
