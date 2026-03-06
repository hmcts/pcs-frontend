import {
  FormBuilderConfigSchema,
  FormFieldConfigSchema,
  FormFieldOptionSchema,
  validateConfigInDevelopment,
  validateFormBuilderConfig,
  validateFormFieldConfig,
} from '../../../../../main/modules/steps/formBuilder/schema';

describe('formBuilder schema', () => {
  describe('FormFieldOptionSchema', () => {
    it('should validate valid FormFieldOption', () => {
      const option = {
        value: 'option1',
        text: 'Option 1',
        translationKey: 'option1Key',
      };

      const result = FormFieldOptionSchema.safeParse(option);
      expect(result.success).toBe(true);
      expect(result.success ? result.data : null).toEqual(option);
    });

    it('should validate FormFieldOption with only value', () => {
      const option = {
        value: 'option1',
      };

      const result = FormFieldOptionSchema.safeParse(option);
      expect(result.success).toBe(true);
    });

    it('should validate FormFieldOption with divider (no value required)', () => {
      const option = {
        divider: 'or',
      };

      const result = FormFieldOptionSchema.safeParse(option);
      expect(result.success).toBe(true);
      expect(result.success ? result.data : null).toEqual(option);
    });
  });

  describe('FormFieldConfigSchema', () => {
    it('should validate valid FormFieldConfig with boolean required', () => {
      const config = {
        name: 'field1',
        type: 'text' as const,
        required: true,
      };

      const result = FormFieldConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should validate FormFieldConfig with function-based required', () => {
      const config = {
        name: 'field1',
        type: 'text' as const,
        required: (formData: Record<string, unknown>) => {
          return formData.field2 === 'value';
        },
      };

      const result = FormFieldConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should validate FormFieldConfig with validate function', () => {
      const config = {
        name: 'field1',
        type: 'text' as const,
        validate: (value: unknown) => {
          if (typeof value === 'string' && value.length < 5) {
            return 'Value too short';
          }
          return undefined;
        },
      };

      const result = FormFieldConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should validate FormFieldConfig with all properties', () => {
      const config = {
        name: 'field1',
        type: 'text' as const,
        required: true,
        pattern: '^[a-z]+$',
        maxLength: 100,
        errorMessage: 'Custom error',
        label: 'Field Label',
        hint: 'Field hint',
        translationKey: {
          label: 'labelKey',
          hint: 'hintKey',
        },
        options: [
          {
            value: 'option1',
            text: 'Option 1',
          },
        ],
        classes: 'custom-class',
        attributes: {
          autocomplete: 'name',
        },
        validate: (_value: unknown) => undefined,
      };

      const result = FormFieldConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject FormFieldConfig without name', () => {
      const config = {
        type: 'text' as const,
      };

      const result = FormFieldConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should reject FormFieldConfig with invalid type', () => {
      const config = {
        name: 'field1',
        type: 'invalid' as unknown,
      };

      const result = FormFieldConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should reject FormFieldConfig with invalid required type', () => {
      const config = {
        name: 'field1',
        type: 'text' as const,
        required: 'invalid' as unknown,
      };

      const result = FormFieldConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should reject FormFieldConfig with invalid validate type', () => {
      const config = {
        name: 'field1',
        type: 'text' as const,
        validate: 'not a function' as unknown,
      };

      const result = FormFieldConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe('FormBuilderConfigSchema', () => {
    it('should validate valid FormBuilderConfig', () => {
      const config = {
        stepName: 'test-step',
        journeyFolder: 'testJourney',
        fields: [
          {
            name: 'field1',
            type: 'text' as const,
          },
        ],
        stepDir: '/path/to/step',
      };

      const result = FormBuilderConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should validate FormBuilderConfig with optional properties', () => {
      const config = {
        stepName: 'test-step',
        journeyFolder: 'testJourney',
        fields: [
          {
            name: 'field1',
            type: 'text' as const,
          },
        ],
        stepDir: '/path/to/step',
        beforeRedirect: async () => {},
        extendGetContent: () => ({}),
        translationKeys: {
          pageTitle: 'pageTitleKey',
          content: 'contentKey',
        },
      };

      const result = FormBuilderConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject FormBuilderConfig without required fields', () => {
      const config = {
        stepName: 'test-step',
        // Missing journeyFolder, fields, stepDir
      };

      const result = FormBuilderConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe('validateFormFieldConfig', () => {
    it('should return success for valid config', () => {
      const config = {
        name: 'field1',
        type: 'text' as const,
      };

      const result = validateFormFieldConfig(config);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return errors for invalid config', () => {
      const config = {
        // Missing name
        type: 'text' as const,
      };

      const result = validateFormFieldConfig(config);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('validateFormBuilderConfig', () => {
    it('should return success for valid config', () => {
      const config = {
        stepName: 'test-step',
        journeyFolder: 'testJourney',
        fields: [
          {
            name: 'field1',
            type: 'text' as const,
          },
        ],
        stepDir: '/path/to/step',
      };

      const result = validateFormBuilderConfig(config);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return errors for invalid config', () => {
      const config = {
        stepName: 'test-step',
        // Missing required fields
      };

      const result = validateFormBuilderConfig(config);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('validateConfigInDevelopment', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should validate config in development mode', () => {
      process.env.NODE_ENV = 'development';

      const config = {
        stepName: 'test-step',
        journeyFolder: 'testJourney',
        fields: [
          {
            name: 'field1',
            type: 'text' as const,
          },
        ],
        stepDir: '/path/to/step',
      };

      const result = validateConfigInDevelopment(config);
      expect(result).toEqual(config);
    });

    it('should not validate config in production mode', () => {
      process.env.NODE_ENV = 'production';

      const config = {
        stepName: 'test-step',
        journeyFolder: 'testJourney',
        fields: [
          {
            name: 'field1',
            type: 'text' as const,
          },
        ],
        stepDir: '/path/to/step',
      };

      const result = validateConfigInDevelopment(config);
      expect(result).toEqual(config);
    });
  });
});
