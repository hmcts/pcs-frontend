import type { FormFieldConfig } from '../../../../../main/interfaces/formFieldConfig.interface';
import {
  buildConditionalContent,
  getNestedFieldName,
  getSubFieldsForOption,
  getVisibleSubFields,
  isOptionSelected,
  parseNestedFieldName,
  shouldValidateField,
} from '../../../../../main/modules/steps/formBuilder/conditionalFields';

describe('conditionalFields', () => {
  describe('isOptionSelected', () => {
    it('should return true when radio value matches option value', () => {
      expect(isOptionSelected('email', 'email', 'radio')).toBe(true);
    });

    it('should return false when radio value does not match option value', () => {
      expect(isOptionSelected('email', 'phone', 'radio')).toBe(false);
    });

    it('should return true when checkbox array includes option value', () => {
      expect(isOptionSelected(['morning', 'evening'], 'evening', 'checkbox')).toBe(true);
    });

    it('should return false when checkbox array does not include option value', () => {
      expect(isOptionSelected(['morning', 'afternoon'], 'evening', 'checkbox')).toBe(false);
    });

    it('should return true when checkbox value equals option value (single selection)', () => {
      expect(isOptionSelected('evening', 'evening', 'checkbox')).toBe(true);
    });

    it('should return false when checkbox value does not equal option value', () => {
      expect(isOptionSelected('morning', 'evening', 'checkbox')).toBe(false);
    });

    it('should return false for invalid field type', () => {
      expect(isOptionSelected('value', 'value', 'text' as 'radio')).toBe(false);
    });
  });

  describe('getSubFieldsForOption', () => {
    const fieldWithSubFields: FormFieldConfig = {
      name: 'contactMethod',
      type: 'radio',
      options: [
        {
          value: 'email',
          subFields: {
            emailAddress: {
              name: 'emailAddress',
              type: 'text',
            },
          },
        },
        {
          value: 'phone',
          subFields: {
            phoneNumber: {
              name: 'phoneNumber',
              type: 'text',
            },
          },
        },
        {
          value: 'post',
        },
      ],
    };

    it('should return subFields when option is selected', () => {
      const result = getSubFieldsForOption(fieldWithSubFields, 'email', 'email');
      expect(result).toBeDefined();
      expect(result?.emailAddress).toBeDefined();
    });

    it('should return undefined when option is not selected', () => {
      const result = getSubFieldsForOption(fieldWithSubFields, 'email', 'phone');
      expect(result).toBeUndefined();
    });

    it('should return undefined when field type is not radio or checkbox', () => {
      const field: FormFieldConfig = {
        name: 'field1',
        type: 'text',
      };
      const result = getSubFieldsForOption(field, 'value', 'value');
      expect(result).toBeUndefined();
    });

    it('should return undefined when field has no options', () => {
      const field: FormFieldConfig = {
        name: 'field1',
        type: 'radio',
      };
      const result = getSubFieldsForOption(field, 'value', 'value');
      expect(result).toBeUndefined();
    });

    it('should return undefined when option does not exist', () => {
      const result = getSubFieldsForOption(fieldWithSubFields, 'nonexistent', 'email');
      expect(result).toBeUndefined();
    });

    it('should return undefined when option has no subFields', () => {
      const result = getSubFieldsForOption(fieldWithSubFields, 'post', 'post');
      expect(result).toBeUndefined();
    });

    it('should work with checkbox fields', () => {
      const checkboxField: FormFieldConfig = {
        name: 'preferredTimes',
        type: 'checkbox',
        options: [
          {
            value: 'evening',
            subFields: {
              eveningTime: {
                name: 'eveningTime',
                type: 'text',
              },
            },
          },
        ],
      };

      const result = getSubFieldsForOption(checkboxField, 'evening', ['evening', 'morning']);
      expect(result).toBeDefined();
      expect(result?.eveningTime).toBeDefined();
    });
  });

  describe('getVisibleSubFields', () => {
    it('should return empty object for non-radio/checkbox fields', () => {
      const field: FormFieldConfig = {
        name: 'field1',
        type: 'text',
      };
      const result = getVisibleSubFields(field, 'value');
      expect(result).toEqual({});
    });

    it('should return empty object when field has no options', () => {
      const field: FormFieldConfig = {
        name: 'field1',
        type: 'radio',
      };
      const result = getVisibleSubFields(field, 'value');
      expect(result).toEqual({});
    });

    it('should return subFields for selected radio option', () => {
      const field: FormFieldConfig = {
        name: 'contactMethod',
        type: 'radio',
        options: [
          {
            value: 'email',
            subFields: {
              emailAddress: {
                name: 'emailAddress',
                type: 'text',
              },
            },
          },
          {
            value: 'phone',
            subFields: {
              phoneNumber: {
                name: 'phoneNumber',
                type: 'text',
              },
            },
          },
        ],
      };

      const result = getVisibleSubFields(field, 'email');
      expect(result.emailAddress).toBeDefined();
      expect(result.phoneNumber).toBeUndefined();
    });

    it('should return subFields for selected checkbox options', () => {
      const field: FormFieldConfig = {
        name: 'preferredTimes',
        type: 'checkbox',
        options: [
          {
            value: 'morning',
            subFields: {
              morningTime: {
                name: 'morningTime',
                type: 'text',
              },
            },
          },
          {
            value: 'evening',
            subFields: {
              eveningTime: {
                name: 'eveningTime',
                type: 'text',
              },
            },
          },
          {
            value: 'afternoon',
          },
        ],
      };

      const result = getVisibleSubFields(field, ['morning', 'evening']);
      expect(result.morningTime).toBeDefined();
      expect(result.eveningTime).toBeDefined();
    });

    it('should merge subFields from multiple selected checkbox options', () => {
      const field: FormFieldConfig = {
        name: 'preferredTimes',
        type: 'checkbox',
        options: [
          {
            value: 'morning',
            subFields: {
              time: {
                name: 'morningTime',
                type: 'text',
              },
            },
          },
          {
            value: 'evening',
            subFields: {
              time: {
                name: 'eveningTime',
                type: 'text',
              },
            },
          },
        ],
      };

      const result = getVisibleSubFields(field, ['morning', 'evening']);
      // Later option overwrites earlier one with same name
      expect(result.time.name).toBe('eveningTime');
    });

    it('should return empty object when no options are selected', () => {
      const field: FormFieldConfig = {
        name: 'contactMethod',
        type: 'radio',
        options: [
          {
            value: 'email',
            subFields: {
              emailAddress: {
                name: 'emailAddress',
                type: 'text',
              },
            },
          },
        ],
      };

      const result = getVisibleSubFields(field, 'phone');
      expect(result).toEqual({});
    });
  });

  describe('buildConditionalContent', () => {
    const translations = {
      title: 'Title',
      hint: 'Hint text',
    };

    it('should return undefined when conditionalText is undefined', () => {
      const result = buildConditionalContent(undefined, translations);
      expect(result).toBeUndefined();
    });

    it('should return string when conditionalText is a string', () => {
      const result = buildConditionalContent('Some text', translations);
      expect(result).toBe('Some text');
    });

    it('should call function and return result when conditionalText is a function', () => {
      const conditionalText = (t: Record<string, string>) => `Title: ${t.title}`;
      const result = buildConditionalContent(conditionalText, translations);
      expect(result).toBe('Title: Title');
    });

    it('should pass translations object to function', () => {
      const conditionalText = jest.fn((t: Record<string, string>) => t.hint);
      buildConditionalContent(conditionalText, translations);
      expect(conditionalText).toHaveBeenCalledWith(translations);
    });
  });

  describe('shouldValidateField', () => {
    const field: FormFieldConfig = {
      name: 'subField',
      type: 'text',
    };

    it('should return true when field is not nested', () => {
      const result = shouldValidateField(field, undefined, undefined, {}, {});
      expect(result).toBe(true);
    });

    it('should return true when parentFieldName is provided but parentOptionValue is not', () => {
      const result = shouldValidateField(field, 'parentField', undefined, {}, {});
      expect(result).toBe(true);
    });

    it('should return true when parent radio option is selected', () => {
      const formData = {};
      const allFormData = {
        parentField: 'option1',
      };
      const result = shouldValidateField(field, 'parentField', 'option1', formData, allFormData);
      expect(result).toBe(true);
    });

    it('should return true when parent checkbox option is selected', () => {
      const formData = {};
      const allFormData = {
        parentField: ['option1', 'option2'],
      };
      const result = shouldValidateField(field, 'parentField', 'option1', formData, allFormData);
      expect(result).toBe(true);
    });

    it('should return false when parent option is not selected (radio)', () => {
      const formData = {};
      const allFormData = {
        parentField: 'option2',
      };
      const result = shouldValidateField(field, 'parentField', 'option1', formData, allFormData);
      expect(result).toBe(false);
    });

    it('should return false when parent option is not selected (checkbox)', () => {
      const formData = {};
      const allFormData = {
        parentField: ['option2', 'option3'],
      };
      const result = shouldValidateField(field, 'parentField', 'option1', formData, allFormData);
      expect(result).toBe(false);
    });

    it('should check formData when allFormData does not have parent field', () => {
      const formData = {
        parentField: 'option1',
      };
      const allFormData = {};
      const result = shouldValidateField(field, 'parentField', 'option1', formData, allFormData);
      expect(result).toBe(true);
    });

    it('should prioritize allFormData over formData', () => {
      const formData = {
        parentField: 'option2',
      };
      const allFormData = {
        parentField: 'option1',
      };
      const result = shouldValidateField(field, 'parentField', 'option1', formData, allFormData);
      expect(result).toBe(true);
    });
  });

  describe('getNestedFieldName', () => {
    it('should combine parent and subField names with dot', () => {
      const result = getNestedFieldName('contactMethod', 'emailAddress');
      expect(result).toBe('contactMethod.emailAddress');
    });

    it('should handle different parent and subField names', () => {
      const result = getNestedFieldName('parentField', 'subField');
      expect(result).toBe('parentField.subField');
    });
  });

  describe('parseNestedFieldName', () => {
    it('should parse nested field name correctly', () => {
      const result = parseNestedFieldName('contactMethod.emailAddress');
      expect(result).not.toBeNull();
      expect(result?.parentFieldName).toBe('contactMethod');
      expect(result?.subFieldName).toBe('emailAddress');
    });

    it('should return null for non-nested field name', () => {
      const result = parseNestedFieldName('simpleField');
      expect(result).toBeNull();
    });

    it('should return null for field name with multiple dots', () => {
      const result = parseNestedFieldName('parent.child.grandchild');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseNestedFieldName('');
      expect(result).toBeNull();
    });

    it('should handle field name starting with dot', () => {
      const result = parseNestedFieldName('.field');
      expect(result).not.toBeNull();
      expect(result?.parentFieldName).toBe('');
      expect(result?.subFieldName).toBe('field');
    });

    it('should handle field name ending with dot', () => {
      const result = parseNestedFieldName('field.');
      expect(result).not.toBeNull();
      expect(result?.parentFieldName).toBe('field');
      expect(result?.subFieldName).toBe('');
    });
  });
});
