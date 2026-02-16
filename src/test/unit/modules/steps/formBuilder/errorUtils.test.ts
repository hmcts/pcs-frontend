import type { TFunction } from 'i18next';

import type { FormFieldConfig } from '../../../../../main/interfaces/formFieldConfig.interface';
import {
  type FormError,
  buildErrorSummary,
  renderWithErrors,
} from '../../../../../main/modules/steps/formBuilder/errorUtils';

describe('errorUtils', () => {
  describe('buildErrorSummary', () => {
    const mockT: TFunction = ((key: string) => {
      const translations: Record<string, string> = {
        'errors.title': 'There is a problem',
      };
      return translations[key] || key;
    }) as TFunction;

    it('should return null when there are no errors', () => {
      const errors: Record<string, string> = {};
      const fields: FormFieldConfig[] = [];

      const result = buildErrorSummary(errors, fields, mockT);
      expect(result).toBeNull();
    });

    it('should create error summary with single error', () => {
      const errors: Record<string, string> = {
        field1: 'Field 1 is required',
      };
      const fields: FormFieldConfig[] = [
        {
          name: 'field1',
          type: 'text',
        },
      ];

      const result = buildErrorSummary(errors, fields, mockT);
      expect(result).not.toBeNull();
      expect(result?.titleText).toBe('There is a problem');
      expect(result?.errorList).toHaveLength(1);
      expect(result?.errorList[0]).toEqual({
        text: 'Field 1 is required',
        href: '#field1',
      });
    });

    it('should create error summary with multiple errors', () => {
      const errors: Record<string, string> = {
        field1: 'Field 1 is required',
        field2: 'Field 2 is invalid',
        field3: 'Field 3 has an error',
      };
      const fields: FormFieldConfig[] = [
        {
          name: 'field1',
          type: 'text',
        },
        {
          name: 'field2',
          type: 'text',
        },
        {
          name: 'field3',
          type: 'text',
        },
      ];

      const result = buildErrorSummary(errors, fields, mockT);
      expect(result).not.toBeNull();
      expect(result?.errorList).toHaveLength(3);
      expect(result?.errorList[0].href).toBe('#field1');
      expect(result?.errorList[1].href).toBe('#field2');
      expect(result?.errorList[2].href).toBe('#field3');
    });

    it('should use correct anchor for date fields with generic error', () => {
      const errors: Record<string, FormError> = {
        dateField: 'Date is required', // String error (backward compatible)
      };
      const fields: FormFieldConfig[] = [
        {
          name: 'dateField',
          type: 'date',
        },
      ];

      const result = buildErrorSummary(errors, fields, mockT);
      expect(result?.errorList[0].href).toBe('#dateField-day');
    });

    it('should anchor to day field when error mentions day', () => {
      const errors: Record<string, FormError> = {
        dateField: {
          message: 'Date must include a day',
          erroneousParts: ['day'],
        },
      };
      const fields: FormFieldConfig[] = [
        {
          name: 'dateField',
          type: 'date',
        },
      ];

      const result = buildErrorSummary(errors, fields, mockT);
      expect(result?.errorList[0].href).toBe('#dateField-day');
    });

    it('should anchor to month field when error mentions month', () => {
      const errors: Record<string, FormError> = {
        dateField: {
          message: 'Date must include a month',
          erroneousParts: ['month'],
        },
      };
      const fields: FormFieldConfig[] = [
        {
          name: 'dateField',
          type: 'date',
        },
      ];

      const result = buildErrorSummary(errors, fields, mockT);
      expect(result?.errorList[0].href).toBe('#dateField-month');
    });

    it('should anchor to year field when error mentions year', () => {
      const errors: Record<string, FormError> = {
        dateField: {
          message: 'Date must include a year',
          erroneousParts: ['year'],
        },
      };
      const fields: FormFieldConfig[] = [
        {
          name: 'dateField',
          type: 'date',
        },
      ];

      const result = buildErrorSummary(errors, fields, mockT);
      expect(result?.errorList[0].href).toBe('#dateField-year');
    });

    it('should anchor to day field when error mentions multiple parts', () => {
      const errors: Record<string, FormError> = {
        dateField: {
          message: 'Date must include a day and month',
          erroneousParts: undefined, // Multiple parts or generic error
        },
      };
      const fields: FormFieldConfig[] = [
        {
          name: 'dateField',
          type: 'date',
        },
      ];

      const result = buildErrorSummary(errors, fields, mockT);
      expect(result?.errorList[0].href).toBe('#dateField-day');
    });

    it('should anchor to day field for generic date errors', () => {
      const errors: Record<string, FormError> = {
        dateField: {
          message: 'Enter a valid date',
          erroneousParts: undefined, // Generic error
        },
      };
      const fields: FormFieldConfig[] = [
        {
          name: 'dateField',
          type: 'date',
        },
      ];

      const result = buildErrorSummary(errors, fields, mockT);
      expect(result?.errorList[0].href).toBe('#dateField-day');
    });

    it('should use correct anchor for radio fields', () => {
      const errors: Record<string, string> = {
        radioField: 'Please select an option',
      };
      const fields: FormFieldConfig[] = [
        {
          name: 'radioField',
          type: 'radio',
        },
      ];

      const result = buildErrorSummary(errors, fields, mockT);
      expect(result?.errorList[0].href).toBe('#radioField');
    });

    it('should use correct anchor for checkbox fields', () => {
      const errors: Record<string, string> = {
        checkboxField: 'Please select at least one option',
      };
      const fields: FormFieldConfig[] = [
        {
          name: 'checkboxField',
          type: 'checkbox',
        },
      ];

      const result = buildErrorSummary(errors, fields, mockT);
      expect(result?.errorList[0].href).toBe('#checkboxField');
    });

    it('should use translation for error summary title', () => {
      const errors: Record<string, string> = {
        field1: 'Error message',
      };
      const fields: FormFieldConfig[] = [
        {
          name: 'field1',
          type: 'text',
        },
      ];

      const customT: TFunction = ((key: string) => {
        if (key === 'errors.title') {
          return 'Custom error title';
        }
        return key;
      }) as TFunction;

      const result = buildErrorSummary(errors, fields, customT);
      expect(result?.titleText).toBe('Custom error title');
    });

    it('should use default title when translation is not available', () => {
      const errors: Record<string, string> = {
        field1: 'Error message',
      };
      const fields: FormFieldConfig[] = [
        {
          name: 'field1',
          type: 'text',
        },
      ];

      const customT: TFunction = ((key: string) => key) as TFunction;

      const result = buildErrorSummary(errors, fields, customT);
      expect(result?.titleText).toBe('There is a problem');
    });
  });

  describe('renderWithErrors', () => {
    // Note: renderWithErrors is an integration function that requires
    // Express request/response objects and various dependencies.
    // Full integration testing would require setting up Express app context.
    // This test verifies the function exists and can be called.
    it('should be a function', () => {
      expect(typeof renderWithErrors).toBe('function');
    });
  });
});
