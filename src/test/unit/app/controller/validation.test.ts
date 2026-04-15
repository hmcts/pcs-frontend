import type { Request } from 'express';

import type { FormFieldConfig } from '@interfaces/formFieldConfig.interface';
import { validateForm } from '@modules/steps';

describe('validateForm', () => {
  it('should return error for missing required radio field', () => {
    const fields: FormFieldConfig[] = [
      { name: 'answer', type: 'radio', required: true, errorMessage: 'Please choose an option' },
    ];

    const req = { body: {}, session: {} } as Partial<Request>;
    // Pass empty translations object so field.errorMessage is used as fallback
    const errors = validateForm(req as Request, fields, {});

    expect(errors.answer).toBe('Please choose an option');
  });

  it('should return error for empty checkbox', () => {
    const fields: FormFieldConfig[] = [
      { name: 'choices', type: 'checkbox', required: true, errorMessage: 'Please select at least one' },
    ];

    const req = { body: { choices: [] }, session: {} } as Partial<Request>;
    // Pass empty translations object so field.errorMessage is used as fallback
    const errors = validateForm(req as Request, fields, {});

    expect(errors.choices).toBe('Please select at least one');
  });

  it('should return no error if required fields are filled', () => {
    const fields: FormFieldConfig[] = [
      { name: 'answer', type: 'radio', required: true },
      { name: 'choices', type: 'checkbox', required: true },
    ];

    const req = {
      body: {
        answer: 'Yes',
        choices: ['option1'],
      },
      session: {},
    } as Partial<Request>;

    const errors = validateForm(req as Request, fields);
    expect(errors).toEqual({});
  });

  describe('special character / emoji validation', () => {
    const emojiFields: FormFieldConfig[] = [{ name: 'testField', type: 'text' }];

    it('should set special character error using field-specific translation', () => {
      const req = { body: { testField: 'hello 🎉' }, session: {} } as Partial<Request>;
      const translations = {
        'testField.specialCharacter': 'Test field must only include letters a to z',
      };

      const errors = validateForm(req as Request, emojiFields, translations);

      expect(errors.testField).toBe('Test field must only include letters a to z');
    });

    it('should set special character error using defaultSpecialCharacter translation with field name interpolated', () => {
      const req = { body: { testField: 'hello 😀' }, session: {} } as Partial<Request>;
      const translations = {
        defaultSpecialCharacter: '{fieldName} must only include letters a to z',
      };

      const errors = validateForm(req as Request, emojiFields, translations);

      expect(errors.testField).toBe('Test field must only include letters a to z');
    });

    it('should fall back to hardcoded message when no translations provided', () => {
      const req = { body: { testField: 'hello 🚀' }, session: {} } as Partial<Request>;

      const errors = validateForm(req as Request, emojiFields, {});

      expect(errors.testField).toBe(
        'Test field must only include letters a to z, and special characters such as hyphens, spaces and apostrophes'
      );
    });

    it('should not overwrite an existing error with special character error', () => {
      const fields: FormFieldConfig[] = [{ name: 'testField', type: 'text', required: true }];
      const req = { body: { testField: '' }, session: {} } as Partial<Request>;

      const errors = validateForm(req as Request, fields, {
        defaultRequired: 'This field is required',
      });

      expect(errors.testField).toBe('This field is required');
    });

    it('should not set special character error for valid text', () => {
      const req = { body: { testField: "valid text with hyphens and apostrophe's" }, session: {} } as Partial<Request>;

      const errors = validateForm(req as Request, emojiFields, {});

      expect(errors.testField).toBeUndefined();
    });

    it('should validate textarea and character-count fields for special characters', () => {
      const fields: FormFieldConfig[] = [
        { name: 'textareaField', type: 'textarea' },
        { name: 'charCountField', type: 'character-count' },
      ];
      const req = {
        body: { textareaField: '🔥 fire', charCountField: '💯 percent' },
        session: {},
      } as Partial<Request>;

      const errors = validateForm(req as Request, fields, {});

      expect(errors.textareaField).toContain('must only include letters a to z');
      expect(errors.charCountField).toContain('must only include letters a to z');
    });
  });
});
