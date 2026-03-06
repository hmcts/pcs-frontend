import type { Request } from 'express';

import type { FormFieldConfig } from '../../../../../main/interfaces/formFieldConfig.interface';
import { validateForm } from '../../../../../main/modules/steps/formBuilder/helpers';

describe('Whitespace Validation', () => {
  const createMockRequest = (body: Record<string, unknown>): Request =>
    ({
      body,
      session: {},
    }) as Request;

  describe('text fields', () => {
    const textField: FormFieldConfig = {
      name: 'testField',
      type: 'text',
      required: true,
    };

    it('should reject whitespace-only input (spaces)', () => {
      const req = createMockRequest({ testField: '   ' });
      const errors = validateForm(req, [textField], {});
      expect(errors.testField).toBe('This field is required');
    });

    it('should reject whitespace-only input (tabs)', () => {
      const req = createMockRequest({ testField: '\t\t\t' });
      const errors = validateForm(req, [textField], {});
      expect(errors.testField).toBe('This field is required');
    });

    it('should reject whitespace-only input (newlines)', () => {
      const req = createMockRequest({ testField: '\n\n' });
      const errors = validateForm(req, [textField], {});
      expect(errors.testField).toBe('This field is required');
    });

    it('should reject mixed whitespace-only input', () => {
      const req = createMockRequest({ testField: ' \t\n \t ' });
      const errors = validateForm(req, [textField], {});
      expect(errors.testField).toBe('This field is required');
    });

    it('should accept text with leading/trailing whitespace', () => {
      const req = createMockRequest({ testField: '  valid text  ' });
      const errors = validateForm(req, [textField], {});
      expect(errors.testField).toBeUndefined();
    });

    it('should accept text with internal whitespace', () => {
      const req = createMockRequest({ testField: 'valid   text' });
      const errors = validateForm(req, [textField], {});
      expect(errors.testField).toBeUndefined();
    });

    it('should reject empty string', () => {
      const req = createMockRequest({ testField: '' });
      const errors = validateForm(req, [textField], {});
      expect(errors.testField).toBe('This field is required');
    });

    it('should accept valid text without whitespace', () => {
      const req = createMockRequest({ testField: 'validtext' });
      const errors = validateForm(req, [textField], {});
      expect(errors.testField).toBeUndefined();
    });
  });

  describe('textarea fields', () => {
    const textareaField: FormFieldConfig = {
      name: 'description',
      type: 'textarea',
      required: true,
    };

    it('should reject whitespace-only textarea input', () => {
      const req = createMockRequest({ description: '   \n\n   ' });
      const errors = validateForm(req, [textareaField], {});
      expect(errors.description).toBe('This field is required');
    });

    it('should accept textarea with valid content', () => {
      const req = createMockRequest({ description: '  Valid description\nwith newlines  ' });
      const errors = validateForm(req, [textareaField], {});
      expect(errors.description).toBeUndefined();
    });
  });

  describe('character-count fields', () => {
    const characterCountField: FormFieldConfig = {
      name: 'disputeDetails',
      type: 'character-count',
      required: true,
      maxLength: 6500,
    };

    it('should reject whitespace-only character-count input', () => {
      const req = createMockRequest({ disputeDetails: '     ' });
      const errors = validateForm(req, [characterCountField], {});
      expect(errors.disputeDetails).toBe('This field is required');
    });

    it('should accept character-count with valid content', () => {
      const req = createMockRequest({ disputeDetails: 'Valid dispute details' });
      const errors = validateForm(req, [characterCountField], {});
      expect(errors.disputeDetails).toBeUndefined();
    });

    it('should accept character-count with leading/trailing whitespace', () => {
      const req = createMockRequest({ disputeDetails: '  Valid content  ' });
      const errors = validateForm(req, [characterCountField], {});
      expect(errors.disputeDetails).toBeUndefined();
    });
  });

  describe('checkbox fields', () => {
    const checkboxField: FormFieldConfig = {
      name: 'agreement',
      type: 'checkbox',
      required: true,
      options: [
        { value: 'yes', translationKey: 'yes' },
        { value: 'no', translationKey: 'no' },
      ],
    };

    it('should reject empty checkbox array', () => {
      const req = createMockRequest({ agreement: [] });
      const errors = validateForm(req, [checkboxField], {});
      expect(errors.agreement).toBe('This field is required');
    });

    it('should reject whitespace-only checkbox string', () => {
      const req = createMockRequest({ agreement: '   ' });
      const errors = validateForm(req, [checkboxField], {});
      expect(errors.agreement).toBe('This field is required');
    });

    it('should accept valid checkbox array', () => {
      const req = createMockRequest({ agreement: ['yes'] });
      const errors = validateForm(req, [checkboxField], {});
      expect(errors.agreement).toBeUndefined();
    });
  });

  describe('optional fields', () => {
    const optionalField: FormFieldConfig = {
      name: 'optionalField',
      type: 'text',
      required: false,
    };

    it('should accept whitespace-only input for optional fields', () => {
      const req = createMockRequest({ optionalField: '   ' });
      const errors = validateForm(req, [optionalField], {});
      expect(errors.optionalField).toBeUndefined();
    });

    it('should accept empty string for optional fields', () => {
      const req = createMockRequest({ optionalField: '' });
      const errors = validateForm(req, [optionalField], {});
      expect(errors.optionalField).toBeUndefined();
    });
  });

  describe('custom error messages', () => {
    const fieldWithCustomError: FormFieldConfig = {
      name: 'customField',
      type: 'text',
      required: true,
      errorMessage: 'Please enter a value',
    };

    it('should use custom error message for whitespace-only input', () => {
      const req = createMockRequest({ customField: '   ' });
      const errors = validateForm(req, [fieldWithCustomError], {});
      expect(errors.customField).toBe('Please enter a value');
    });
  });

  describe('conditional required fields', () => {
    const conditionalField: FormFieldConfig = {
      name: 'conditionalField',
      type: 'text',
      required: (formData: Record<string, unknown>) => formData.trigger === 'yes',
    };

    it('should reject whitespace when conditionally required', () => {
      const req = createMockRequest({ trigger: 'yes', conditionalField: '   ' });
      const errors = validateForm(req, [conditionalField], {});
      expect(errors.conditionalField).toBe('This field is required');
    });

    it('should accept whitespace when not conditionally required', () => {
      const req = createMockRequest({ trigger: 'no', conditionalField: '   ' });
      const errors = validateForm(req, [conditionalField], {});
      expect(errors.conditionalField).toBeUndefined();
    });
  });

  describe('subFields validation', () => {
    const radioWithSubField: FormFieldConfig = {
      name: 'disputeClaim',
      type: 'radio',
      required: true,
      options: [
        {
          value: 'yes',
          translationKey: 'yes',
          subFields: {
            disputeDetails: {
              name: 'disputeDetails',
              type: 'character-count',
              required: true,
              errorMessage: 'errors.disputeDetails',
              maxLength: 6500,
            },
          },
        },
        {
          value: 'no',
          translationKey: 'no',
        },
      ],
    };

    it('should reject whitespace-only input in subFields', () => {
      const req = createMockRequest({
        disputeClaim: 'yes',
        'disputeClaim.disputeDetails': '   ',
      });
      const errors = validateForm(req, [radioWithSubField], {});
      expect(errors['disputeClaim.disputeDetails']).toBe('errors.disputeDetails');
    });

    it('should accept valid input in subFields', () => {
      const req = createMockRequest({
        disputeClaim: 'yes',
        'disputeClaim.disputeDetails': 'Valid dispute details',
      });
      const errors = validateForm(req, [radioWithSubField], {});
      expect(errors['disputeClaim.disputeDetails']).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    const textField: FormFieldConfig = {
      name: 'edgeCase',
      type: 'text',
      required: true,
    };

    it('should handle undefined value', () => {
      const req = createMockRequest({ edgeCase: undefined });
      const errors = validateForm(req, [textField], {});
      expect(errors.edgeCase).toBe('This field is required');
    });

    it('should handle null value', () => {
      const req = createMockRequest({ edgeCase: null });
      const errors = validateForm(req, [textField], {});
      expect(errors.edgeCase).toBe('This field is required');
    });

    it('should handle zero as valid input', () => {
      const numberField: FormFieldConfig = {
        name: 'numberField',
        type: 'text',
        required: true,
      };
      const req = createMockRequest({ numberField: 0 });
      const errors = validateForm(req, [numberField], {});
      expect(errors.numberField).toBeUndefined();
    });

    it('should handle single space', () => {
      const req = createMockRequest({ edgeCase: ' ' });
      const errors = validateForm(req, [textField], {});
      expect(errors.edgeCase).toBe('This field is required');
    });

    it('should handle unicode whitespace', () => {
      const req = createMockRequest({ edgeCase: '\u00A0\u00A0' }); // Non-breaking spaces
      const errors = validateForm(req, [textField], {});
      expect(errors.edgeCase).toBe('This field is required');
    });
  });
});
