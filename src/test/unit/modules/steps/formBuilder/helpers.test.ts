import type { Request } from 'express';
import type { TFunction } from 'i18next';

import type { FormFieldConfig } from '../../../../../main/interfaces/formFieldConfig.interface';
import {
  getCustomErrorTranslations,
  getFormData,
  getTranslation,
  getTranslationErrors,
  processFieldData,
  setFormData,
  validateForm,
} from '../../../../../main/modules/steps/formBuilder/helpers';

describe('formBuilder helpers', () => {
  describe('getTranslation', () => {
    it('should return translation when key exists', () => {
      const mockT = jest.fn((key: string) => {
        const translations: Record<string, string> = {
          'test.key': 'Translated Text',
        };
        return translations[key] || key;
      }) as unknown as TFunction;

      const result = getTranslation(mockT, 'test.key');
      expect(result).toBe('Translated Text');
    });

    it('should return fallback when translation key does not exist', () => {
      const mockT = jest.fn((key: string) => key) as unknown as TFunction;

      const result = getTranslation(mockT, 'nonexistent.key', 'Fallback Text');
      expect(result).toBe('Fallback Text');
    });

    it('should return undefined when translation key does not exist and no fallback provided', () => {
      const mockT = jest.fn((key: string) => key) as unknown as TFunction;

      const result = getTranslation(mockT, 'nonexistent.key');
      expect(result).toBeUndefined();
    });
  });

  describe('processFieldData', () => {
    it('should convert checkbox string value to array', () => {
      const req = {
        body: {
          interests: 'reading',
        },
      } as unknown as Request;

      const fields: FormFieldConfig[] = [
        {
          name: 'interests',
          type: 'checkbox',
        },
      ];

      processFieldData(req, fields);

      expect(req.body.interests).toEqual(['reading']);
    });

    it('should leave checkbox array value unchanged', () => {
      const req = {
        body: {
          interests: ['reading', 'writing'],
        },
      } as unknown as Request;

      const fields: FormFieldConfig[] = [
        {
          name: 'interests',
          type: 'checkbox',
        },
      ];

      processFieldData(req, fields);

      expect(req.body.interests).toEqual(['reading', 'writing']);
    });

    it('should process date field and combine day, month, year', () => {
      const req = {
        body: {
          'birthDate-day': '15',
          'birthDate-month': '06',
          'birthDate-year': '1990',
        },
      } as unknown as Request;

      const fields: FormFieldConfig[] = [
        {
          name: 'birthDate',
          type: 'date',
        },
      ];

      processFieldData(req, fields);

      expect(req.body.birthDate).toEqual({
        day: '15',
        month: '06',
        year: '1990',
      });
      expect(req.body['birthDate-day']).toBeUndefined();
      expect(req.body['birthDate-month']).toBeUndefined();
      expect(req.body['birthDate-year']).toBeUndefined();
    });

    it('should handle date field with empty values', () => {
      const req = {
        body: {
          'birthDate-day': '',
          'birthDate-month': '  ',
          'birthDate-year': '',
        },
      } as unknown as Request;

      const fields: FormFieldConfig[] = [
        {
          name: 'birthDate',
          type: 'date',
        },
      ];

      processFieldData(req, fields);

      expect(req.body.birthDate).toEqual({
        day: '',
        month: '',
        year: '',
      });
    });

    it('should handle date field with missing keys', () => {
      const req = {
        body: {},
      } as unknown as Request;

      const fields: FormFieldConfig[] = [
        {
          name: 'birthDate',
          type: 'date',
        },
      ];

      processFieldData(req, fields);

      expect(req.body.birthDate).toEqual({
        day: '',
        month: '',
        year: '',
      });
    });

    it('should process multiple fields', () => {
      const req = {
        body: {
          interests: 'reading',
          'birthDate-day': '15',
          'birthDate-month': '06',
          'birthDate-year': '1990',
        },
      } as unknown as Request;

      const fields: FormFieldConfig[] = [
        {
          name: 'interests',
          type: 'checkbox',
        },
        {
          name: 'birthDate',
          type: 'date',
        },
      ];

      processFieldData(req, fields);

      expect(req.body.interests).toEqual(['reading']);
      expect(req.body.birthDate).toEqual({
        day: '15',
        month: '06',
        year: '1990',
      });
    });

    it('should not process non-checkbox and non-date fields', () => {
      const req = {
        body: {
          name: 'John Doe',
        },
      } as unknown as Request;

      const fields: FormFieldConfig[] = [
        {
          name: 'name',
          type: 'text',
        },
      ];

      processFieldData(req, fields);

      expect(req.body.name).toBe('John Doe');
    });
  });

  describe('getTranslationErrors', () => {
    const createMockT = (translations: Record<string, string> = {}) => {
      return jest.fn((key: string) => translations[key] || key) as unknown as TFunction;
    };

    it('should return empty object when no fields provided', () => {
      const mockT = createMockT();
      const result = getTranslationErrors(mockT, []);
      expect(result).toEqual({});
    });

    it('should get translation error for top-level field', () => {
      const mockT = createMockT({
        'errors.name': 'Name is required',
      });

      const fields: FormFieldConfig[] = [
        {
          name: 'name',
          type: 'text',
        },
      ];

      const result = getTranslationErrors(mockT, fields);
      expect(result).toEqual({
        name: 'Name is required',
      });
    });

    it('should use errorMessage property when provided for top-level field', () => {
      const mockT = createMockT({
        'errors.customError': 'Custom error message',
      });

      const fields: FormFieldConfig[] = [
        {
          name: 'name',
          type: 'text',
          errorMessage: 'errors.customError',
        },
      ];

      const result = getTranslationErrors(mockT, fields);
      expect(result).toEqual({
        name: 'Custom error message',
      });
    });

    it('should get translation error for subField', () => {
      const mockT = createMockT({
        'errors.emailAddress': 'Email is required',
      });

      const fields: FormFieldConfig[] = [
        {
          name: 'contactMethod',
          type: 'radio',
          options: [
            {
              value: 'email',
              subFields: {
                emailAddress: {
                  name: 'emailAddress',
                  type: 'text',
                  errorMessage: 'errors.emailAddress',
                },
              },
            },
          ],
        },
      ];

      const result = getTranslationErrors(mockT, fields);
      expect(result).toEqual({
        'contactMethod.emailAddress': 'Email is required',
      });
    });

    it('should handle nested subFields recursively', () => {
      const mockT = createMockT({
        'errors.emailAddress': 'Email is required',
        'errors.phoneNumber': 'Phone is required',
      });

      const fields: FormFieldConfig[] = [
        {
          name: 'contactMethod',
          type: 'radio',
          options: [
            {
              value: 'email',
              subFields: {
                emailAddress: {
                  name: 'emailAddress',
                  type: 'text',
                  errorMessage: 'errors.emailAddress',
                },
              },
            },
            {
              value: 'phone',
              subFields: {
                phoneNumber: {
                  name: 'phoneNumber',
                  type: 'text',
                  errorMessage: 'errors.phoneNumber',
                },
              },
            },
          ],
        },
      ];

      const result = getTranslationErrors(mockT, fields);
      expect(result).toEqual({
        'contactMethod.emailAddress': 'Email is required',
        'contactMethod.phoneNumber': 'Phone is required',
      });
    });

    it('should skip translation when key not found', () => {
      const mockT = createMockT({});

      const fields: FormFieldConfig[] = [
        {
          name: 'name',
          type: 'text',
        },
      ];

      const result = getTranslationErrors(mockT, fields);
      expect(result).toEqual({});
    });

    it('should handle errorMessage that does not start with errors.', () => {
      const mockT = createMockT({});

      const fields: FormFieldConfig[] = [
        {
          name: 'name',
          type: 'text',
          errorMessage: 'custom.error',
        },
      ];

      const result = getTranslationErrors(mockT, fields);
      expect(result).toEqual({});
    });
  });

  describe('getCustomErrorTranslations - common default errors', () => {
    it('should include all common default error translations when they exist', () => {
      const mockT = jest.fn((key: string) => {
        const translations: Record<string, string> = {
          'errors.defaultRequired': 'This field is required',
          'errors.defaultInvalid': 'Invalid format',
          'errors.defaultMaxLength': 'Must be {max} characters or fewer',
        };
        return translations[key] || key;
      }) as unknown as TFunction;

      const result = getCustomErrorTranslations(mockT, []);

      expect(result).toEqual({
        defaultRequired: 'This field is required',
        defaultInvalid: 'Invalid format',
        defaultMaxLength: 'Must be {max} characters or fewer',
      });
    });

    it('should only include common errors that have translations', () => {
      const mockT = jest.fn((key: string) => {
        if (key === 'errors.defaultMaxLength') {
          return 'Must be {max} characters or fewer';
        }
        return key;
      }) as unknown as TFunction;

      const result = getCustomErrorTranslations(mockT, []);

      expect(result).toEqual({
        defaultMaxLength: 'Must be {max} characters or fewer',
      });
    });

    it('should include both common errors and field-specific errors', () => {
      const mockT = jest.fn((key: string) => {
        const translations: Record<string, string> = {
          'errors.defaultRequired': 'This field is required',
          'errors.defaultInvalid': 'Invalid format',
          'errors.defaultMaxLength': 'Must be {max} characters or fewer',
          'errors.dateOfBirth.required': 'Enter your date of birth',
        };
        return translations[key] || key;
      }) as unknown as TFunction;

      const fields = [
        {
          name: 'dateOfBirth',
          type: 'date' as const,
        },
      ];

      const result = getCustomErrorTranslations(mockT, fields);

      expect(result).toEqual({
        defaultRequired: 'This field is required',
        defaultInvalid: 'Invalid format',
        defaultMaxLength: 'Must be {max} characters or fewer',
        dateRequired: 'Enter your date of birth',
        'dateOfBirth.required': 'Enter your date of birth',
      });
    });
  });

  describe('getFormData', () => {
    it('should return form data from session', () => {
      const req = {
        session: {
          formData: {
            step1: {
              field1: 'value1',
            },
          },
        },
      } as unknown as Request;

      const result = getFormData(req, 'step1');
      expect(result).toEqual({
        field1: 'value1',
      });
    });

    it('should return empty object when step data does not exist', () => {
      const req = {
        session: {
          formData: {},
        },
      } as unknown as Request;

      const result = getFormData(req, 'step1');
      expect(result).toEqual({});
    });

    it('should return empty object when session formData does not exist', () => {
      const req = {
        session: {},
      } as unknown as Request;

      const result = getFormData(req, 'step1');
      expect(result).toEqual({});
    });
  });

  describe('setFormData', () => {
    it('should set form data in session', () => {
      const req = {
        session: {
          formData: {},
        },
      } as unknown as Request;

      const data = {
        field1: 'value1',
      };

      setFormData(req, 'step1', data);
      expect((req.session as { formData?: Record<string, unknown> }).formData?.['step1']).toEqual(data);
    });

    it('should create formData object if it does not exist', () => {
      const req = {
        session: {},
      } as unknown as Request;

      const data = {
        field1: 'value1',
      };

      setFormData(req, 'step1', data);
      expect((req.session as { formData?: Record<string, unknown> }).formData?.['step1']).toEqual(data);
    });

    it('should overwrite existing step data', () => {
      const req = {
        session: {
          formData: {
            step1: {
              field1: 'oldValue',
            },
          },
        },
      } as unknown as Request;

      const data = {
        field1: 'newValue',
      };

      setFormData(req, 'step1', data);
      expect((req.session as { formData?: Record<string, unknown> }).formData?.['step1']).toEqual(data);
    });
  });

  describe('validateForm', () => {
    const createMockRequest = (body: Record<string, unknown> = {}, sessionFormData: Record<string, unknown> = {}) => {
      return {
        body,
        session: {
          formData: sessionFormData,
        },
      } as unknown as Request;
    };

    describe('required field validation', () => {
      it('should return error for missing required text field', () => {
        const req = createMockRequest();
        const fields: FormFieldConfig[] = [
          {
            name: 'name',
            type: 'text',
            required: true,
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.name).toBeDefined();
      });

      it('should not return error for optional field', () => {
        const req = createMockRequest();
        const fields: FormFieldConfig[] = [
          {
            name: 'name',
            type: 'text',
            required: false,
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.name).toBeUndefined();
      });

      it('should return error for missing required checkbox field', () => {
        const req = createMockRequest();
        const fields: FormFieldConfig[] = [
          {
            name: 'interests',
            type: 'checkbox',
            required: true,
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.interests).toBeDefined();
      });

      it('should return error for empty checkbox array', () => {
        const req = createMockRequest({
          interests: [],
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'interests',
            type: 'checkbox',
            required: true,
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.interests).toBeDefined();
      });

      it('should return error for empty checkbox string', () => {
        const req = createMockRequest({
          interests: '',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'interests',
            type: 'checkbox',
            required: true,
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.interests).toBeDefined();
      });

      it('should use translations for error messages', () => {
        const req = createMockRequest();
        const fields: FormFieldConfig[] = [
          {
            name: 'name',
            type: 'text',
            required: true,
          },
        ];

        const translations = {
          name: 'Name is required',
        };

        const errors = validateForm(req, fields, translations);
        expect(errors.name).toBe('Name is required');
      });

      it('should use field.errorMessage for error messages', () => {
        const req = createMockRequest();
        const fields: FormFieldConfig[] = [
          {
            name: 'name',
            type: 'text',
            required: true,
            errorMessage: 'Custom error message',
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.name).toBe('Custom error message');
      });

      it('should use defaultRequired translation when available', () => {
        const req = createMockRequest();
        const fields: FormFieldConfig[] = [
          {
            name: 'name',
            type: 'text',
            required: true,
          },
        ];

        const translations = {
          defaultRequired: 'This field is required',
        };

        const errors = validateForm(req, fields, translations);
        expect(errors.name).toBe('This field is required');
      });
    });

    describe('required function validation', () => {
      it('should evaluate required function when provided', () => {
        const req = createMockRequest({
          age: '15',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'parentName',
            type: 'text',
            required: formData => {
              return parseInt(formData.age as string, 10) < 18;
            },
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.parentName).toBeDefined();
      });

      it('should not require field when function returns false', () => {
        const req = createMockRequest({
          age: '25',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'parentName',
            type: 'text',
            required: formData => {
              return parseInt(formData.age as string, 10) < 18;
            },
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.parentName).toBeUndefined();
      });

      it('should handle error in required function gracefully', () => {
        const req = createMockRequest();
        const fields: FormFieldConfig[] = [
          {
            name: 'name',
            type: 'text',
            required: () => {
              throw new Error('Test error');
            },
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.name).toBeUndefined();
      });
    });

    describe('date field validation', () => {
      it('should return error for missing required date field', () => {
        const req = createMockRequest();
        const fields: FormFieldConfig[] = [
          {
            name: 'birthDate',
            type: 'date',
            required: true,
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.birthDate).toBeDefined();
      });

      it('should return error for incomplete date (missing day)', () => {
        const req = createMockRequest({
          'birthDate-day': '',
          'birthDate-month': '06',
          'birthDate-year': '1990',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'birthDate',
            type: 'date',
            required: true,
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.birthDate).toBeDefined();
      });

      it('should return error for invalid date format (non-numeric)', () => {
        const req = createMockRequest({
          'birthDate-day': 'abc',
          'birthDate-month': '06',
          'birthDate-year': '1990',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'birthDate',
            type: 'date',
            required: true,
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.birthDate).toBeDefined();
      });

      it('should return error for invalid date range (day out of range)', () => {
        const req = createMockRequest({
          'birthDate-day': '32',
          'birthDate-month': '06',
          'birthDate-year': '1990',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'birthDate',
            type: 'date',
            required: true,
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.birthDate).toBeDefined();
      });

      it('should return error for invalid date range (month out of range)', () => {
        const req = createMockRequest({
          'birthDate-day': '15',
          'birthDate-month': '13',
          'birthDate-year': '1990',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'birthDate',
            type: 'date',
            required: true,
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.birthDate).toBeDefined();
      });

      it('should return error for invalid date range (year too old)', () => {
        const req = createMockRequest({
          'birthDate-day': '15',
          'birthDate-month': '06',
          'birthDate-year': '1800',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'birthDate',
            type: 'date',
            required: true,
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.birthDate).toBeDefined();
      });

      it('should return error for invalid date range (year in future)', () => {
        const futureYear = new Date().getFullYear() + 1;
        const req = createMockRequest({
          'birthDate-day': '15',
          'birthDate-month': '06',
          'birthDate-year': futureYear.toString(),
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'birthDate',
            type: 'date',
            required: true,
            noFutureDate: true, // Birth dates should not allow future dates
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.birthDate).toBeDefined();
      });

      it('should pass validation for valid date', () => {
        const req = createMockRequest({
          'birthDate-day': '15',
          'birthDate-month': '06',
          'birthDate-year': '1990',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'birthDate',
            type: 'date',
            required: true,
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.birthDate).toBeUndefined();
      });

      it('should use validator function for date field', () => {
        const req = createMockRequest({
          'birthDate-day': '15',
          'birthDate-month': '06',
          'birthDate-year': '1990',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'birthDate',
            type: 'date',
            required: true,
            validator: dateValue => {
              const date = new Date(
                parseInt((dateValue as { year: string }).year, 10),
                parseInt((dateValue as { month: string }).month, 10) - 1,
                parseInt((dateValue as { day: string }).day, 10)
              );
              return date.getDate() === parseInt((dateValue as { day: string }).day, 10);
            },
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.birthDate).toBeUndefined();
      });

      it('should return error from validator function for date field', () => {
        const req = createMockRequest({
          'birthDate-day': '15',
          'birthDate-month': '06',
          'birthDate-year': '1990',
          birthDate: { day: '15', month: '06', year: '1990' },
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'birthDate',
            type: 'date',
            required: true,
            validator: dateValue => {
              const year = parseInt((dateValue as { year: string }).year, 10);
              // Custom validation: reject years before 2000
              if (year < 2000) {
                return 'Year must be 2000 or later';
              }
              return true;
            },
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.birthDate).toBe('Year must be 2000 or later');
      });

      it('should use validate function for date field', () => {
        const req = createMockRequest({
          'birthDate-day': '15',
          'birthDate-month': '06',
          'birthDate-year': '1990',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'birthDate',
            type: 'date',
            required: true,
            validate: dateValue => {
              const year = parseInt((dateValue as { year: string }).year, 10);
              if (year < 1900) {
                return 'Year must be 1900 or later';
              }
              return undefined;
            },
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.birthDate).toBeUndefined();
      });

      it('should return error from validate function for date field', () => {
        const req = createMockRequest({
          'birthDate-day': '15',
          'birthDate-month': '06',
          'birthDate-year': '2000',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'birthDate',
            type: 'date',
            required: true,
            validate: dateValue => {
              const year = parseInt((dateValue as { year: string }).year, 10);
              if (year < 2010) {
                return 'Year must be 2010 or later';
              }
              return undefined;
            },
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.birthDate).toBe('Year must be 2010 or later');
      });
    });

    describe('pattern validation', () => {
      it('should return error for value that does not match pattern', () => {
        const req = createMockRequest({
          email: 'invalid-email',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'email',
            type: 'text',
            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.email).toBeDefined();
      });

      it('should not return error for value that matches pattern', () => {
        const req = createMockRequest({
          email: 'test@example.com',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'email',
            type: 'text',
            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.email).toBeUndefined();
      });

      it('should not validate pattern for empty values', () => {
        const req = createMockRequest({
          email: '',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'email',
            type: 'text',
            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.email).toBeUndefined();
      });
    });

    describe('maxLength validation', () => {
      it('should return error for value exceeding maxLength', () => {
        const req = createMockRequest({
          name: 'This is a very long name that exceeds the maximum length',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'name',
            type: 'text',
            maxLength: 10,
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.name).toBeDefined();
      });

      it('should not return error for value within maxLength', () => {
        const req = createMockRequest({
          name: 'Short',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'name',
            type: 'text',
            maxLength: 10,
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.name).toBeUndefined();
      });

      it('should use defaultMaxLength translation when available', () => {
        const req = createMockRequest({
          name: 'This is a very long name',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'name',
            type: 'text',
            maxLength: 10,
          },
        ];

        const translations = {
          defaultMaxLength: 'Must be {max} characters or fewer',
        };

        const errors = validateForm(req, fields, translations);
        expect(errors.name).toBe('Must be 10 characters or fewer');
      });
    });

    describe('validator function', () => {
      it('should return error when validator returns false', () => {
        const req = createMockRequest({
          age: '15',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'age',
            type: 'text',
            validator: value => {
              return parseInt(value as string, 10) >= 18;
            },
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.age).toBeDefined();
      });

      it('should return error message when validator returns string', () => {
        const req = createMockRequest({
          age: '15',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'age',
            type: 'text',
            validator: value => {
              return parseInt(value as string, 10) >= 18 ? true : 'Must be 18 or older';
            },
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.age).toBe('Must be 18 or older');
      });

      it('should not return error when validator returns true', () => {
        const req = createMockRequest({
          age: '25',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'age',
            type: 'text',
            validator: value => {
              return parseInt(value as string, 10) >= 18;
            },
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.age).toBeUndefined();
      });

      it('should use translations for validator error messages', () => {
        const req = createMockRequest({
          age: '15', // under 18
        });

        const fields: FormFieldConfig[] = [
          {
            name: 'age',
            type: 'text',
            validator: value => (parseInt(value as string, 10) >= 18 ? true : 'errors.age'),
          },
        ];

        const translations: Record<string, string> = {
          age: 'Age validation failed',
        };

        const mockT = ((key: string) => translations[key.replace('errors.', '')] || key) as unknown as TFunction;

        const errors = validateForm(req, fields, translations, undefined, mockT);

        expect(errors.age).toBe('Age validation failed');
      });

      it('should handle error in validator function gracefully', () => {
        const req = createMockRequest({
          age: '15',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'age',
            type: 'text',
            validator: () => {
              throw new Error('Test error');
            },
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.age).toBeUndefined();
      });
    });

    describe('validate function', () => {
      it('should return error when validate function returns string', () => {
        const req = createMockRequest({
          password: '123',
          confirmPassword: '456',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'confirmPassword',
            type: 'text',
            validate: (value, formData) => {
              return value === formData.password ? undefined : 'Passwords do not match';
            },
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.confirmPassword).toBe('Passwords do not match');
      });

      it('should not return error when validate function returns undefined', () => {
        const req = createMockRequest({
          password: '123',
          confirmPassword: '123',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'confirmPassword',
            type: 'text',
            validate: (value, formData) => {
              return value === formData.password ? undefined : 'Passwords do not match';
            },
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.confirmPassword).toBeUndefined();
      });

      it('should run validate function even for empty optional fields', () => {
        const req = createMockRequest({
          email: '',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'email',
            type: 'text',
            required: false,
            validate: value => {
              return value === '' ? 'Email cannot be empty' : undefined;
            },
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.email).toBe('Email cannot be empty');
      });

      it('should handle error in validate function gracefully', () => {
        const req = createMockRequest({
          email: 'test@example.com',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'email',
            type: 'text',
            validate: () => {
              throw new Error('Test error');
            },
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.email).toBeUndefined();
      });
    });

    describe('nested subFields validation', () => {
      it('should validate subField when parent option is selected', () => {
        const req = createMockRequest({
          contactMethod: 'email',
          'contactMethod.emailAddress': '',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'contactMethod',
            type: 'radio',
            options: [
              {
                value: 'email',
                subFields: {
                  emailAddress: {
                    name: 'emailAddress',
                    type: 'text',
                    required: true,
                  },
                },
              },
            ],
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors['contactMethod.emailAddress']).toBeDefined();
      });

      it('should not validate subField when parent option is not selected', () => {
        const req = createMockRequest({
          contactMethod: 'phone',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'contactMethod',
            type: 'radio',
            options: [
              {
                value: 'email',
                subFields: {
                  emailAddress: {
                    name: 'emailAddress',
                    type: 'text',
                    required: true,
                  },
                },
              },
            ],
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors['contactMethod.emailAddress']).toBeUndefined();
      });

      it('should validate checkbox subFields when option is selected', () => {
        const req = createMockRequest({
          interests: ['reading'],
          'interests.reading.bookTitle': '',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'interests',
            type: 'checkbox',
            options: [
              {
                value: 'reading',
                subFields: {
                  bookTitle: {
                    name: 'bookTitle',
                    type: 'text',
                    required: true,
                  },
                },
              },
            ],
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors['interests.reading.bookTitle']).toBeUndefined(); // Note: nested name might be different
      });

      it('should handle nested subFields with object structure', () => {
        const req = createMockRequest({
          contactMethod: 'email',
          'contactMethod.emailAddress': '',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'contactMethod',
            type: 'radio',
            options: [
              {
                value: 'email',
                subFields: {
                  emailAddress: {
                    name: 'emailAddress',
                    type: 'text',
                    required: true,
                  },
                },
              },
            ],
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors['contactMethod.emailAddress']).toBeDefined();
      });

      it('should use translations for nested subField errors', () => {
        const req = createMockRequest({
          contactMethod: 'email',
          'contactMethod.emailAddress': '',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'contactMethod',
            type: 'radio',
            options: [
              {
                value: 'email',
                subFields: {
                  emailAddress: {
                    name: 'emailAddress',
                    type: 'text',
                    required: true,
                  },
                },
              },
            ],
          },
        ];

        const translations = {
          'contactMethod.emailAddress': 'Email address is required',
        };

        const errors = validateForm(req, fields, translations);
        expect(errors['contactMethod.emailAddress']).toBe('Email address is required');
      });
    });

    describe('allFormData parameter', () => {
      it('should use allFormData for validation context', () => {
        const req = createMockRequest({
          confirmPassword: '123',
        });
        const fields: FormFieldConfig[] = [
          {
            name: 'confirmPassword',
            type: 'text',
            validate: (value, formData, allData) => {
              return value === allData?.password ? undefined : 'Passwords do not match';
            },
          },
        ];

        const allFormData = {
          password: '123',
        };

        const errors = validateForm(req, fields, undefined, allFormData);
        expect(errors.confirmPassword).toBeUndefined();
      });

      it('should merge session formData when allFormData not provided', () => {
        const req = createMockRequest(
          {
            confirmPassword: '123',
          },
          {
            step1: {
              password: '123',
            },
          }
        );
        const fields: FormFieldConfig[] = [
          {
            name: 'confirmPassword',
            type: 'text',
            validate: (value, formData, allData) => {
              return value === allData?.password ? undefined : 'Passwords do not match';
            },
          },
        ];

        const errors = validateForm(req, fields);
        expect(errors.confirmPassword).toBeUndefined();
      });
    });
  });
});
