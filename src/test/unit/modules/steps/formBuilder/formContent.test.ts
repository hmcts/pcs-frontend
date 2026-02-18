import type { FormFieldConfig } from '../../../../../main/interfaces/formFieldConfig.interface';
import { buildFormContent } from '../../../../../main/modules/steps/formBuilder/formContent';

describe('FormContent - Button Text Fix', () => {
  let mockT: jest.Mock;
  let mockNunjucksEnv: { render: jest.Mock };

  beforeEach(() => {
    mockT = jest.fn((key: string) => {
      const translations: Record<string, string> = {
        'buttons.saveAndContinue': 'Save and continue',
        'buttons.continue': 'Continue',
        'buttons.saveForLater': 'Save for later',
      };
      return translations[key] || key;
    });

    mockNunjucksEnv = {
      render: jest.fn((template: string) => `<div>${template}</div>`),
    };
  });

  describe('Fix #2: Button Text at Top Level', () => {
    it('should provide button text at top level (not nested in buttons object)', () => {
      const fields: FormFieldConfig[] = [
        {
          name: 'testField',
          type: 'text',
          required: true,
          translationKey: { label: 'testLabel' },
        },
      ];

      const result = buildFormContent(fields, mockT, {}, {}, undefined, mockNunjucksEnv);

      // Button text should be at top level
      expect(result.saveAndContinue).toBe('Save and continue');
      expect(result.continue).toBe('Continue');
      expect(result.saveForLater).toBe('Save for later');

      // Should NOT be nested in buttons object
      expect('buttons' in result).toBe(false);
    });

    it('should allow templates to access button text directly', () => {
      const fields: FormFieldConfig[] = [];
      const result = buildFormContent(fields, mockT, {}, {}, undefined, mockNunjucksEnv);

      // These should work in templates: {{ govukButton({ text: saveAndContinue }) }}
      expect(result.saveAndContinue).toBeDefined();
      expect(typeof result.saveAndContinue).toBe('string');

      // This would fail in templates: {{ govukButton({ text: buttons.saveAndContinue }) }}
      expect('buttons' in result).toBe(false);
    });

    it('should provide all three button texts consistently', () => {
      const fields: FormFieldConfig[] = [];
      const result = buildFormContent(fields, mockT, {}, {}, undefined, mockNunjucksEnv);

      expect(result).toMatchObject({
        saveAndContinue: expect.any(String),
        continue: expect.any(String),
        saveForLater: expect.any(String),
      });

      expect(result.saveAndContinue).not.toBe('');
      expect(result.continue).not.toBe('');
      expect(result.saveForLater).not.toBe('');
    });
  });
});
