import type { TFunction } from 'i18next';
import type { Environment } from 'nunjucks';

import {
  buildComponentConfig,
  buildConditionalItemContent,
  buildSelectionItems,
} from '../../../../../main/modules/steps/formBuilder/componentBuilders';

import type { FormFieldConfig, FormFieldOption } from '@modules/steps/formBuilder/formFieldConfig.interface';

describe('componentBuilders', () => {
  const mockRender = jest.fn(() => '<div>Rendered subfields</div>');
  const mockNunjucksEnv = {
    render: mockRender,
  } as unknown as Environment;

  const buildArgs = (field: FormFieldConfig, overrides: Partial<Parameters<typeof buildComponentConfig>[0]> = {}) => ({
    field,
    label: 'Test label',
    hint: undefined,
    fieldValue: undefined,
    translatedOptions: undefined,
    hasError: false,
    errorText: undefined,
    index: 0,
    hasTitle: false,
    t: ((key: string) => key) as unknown as TFunction,
    nunjucksEnv: mockNunjucksEnv,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildConditionalItemContent', () => {
    it('should return undefined when there is no conditional content', () => {
      expect(buildConditionalItemContent({ value: 'yes', text: 'Yes' }, mockNunjucksEnv)).toBeUndefined();
    });

    it('should combine conditional text and rendered subfields', () => {
      const option: FormFieldOption = {
        value: 'yes',
        conditionalText: '<p>Please provide details below</p>',
        subFields: {
          details: {
            name: 'details',
            type: 'text',
            component: {},
            componentType: 'input',
          },
        },
      };

      const result = buildConditionalItemContent(option, mockNunjucksEnv);

      expect(mockRender).toHaveBeenCalledWith('components/subFields.njk', {
        subFields: [option.subFields?.details],
      });
      expect(result).toBe('<p>Please provide details below</p>\n<div>Rendered subfields</div>');
    });
  });

  describe('buildSelectionItems', () => {
    it('should build selection items with translated text, hints and checked state', () => {
      const result = buildSelectionItems(
        [{ value: 'yes', text: 'Yes', hint: 'fallback hint' }, { divider: 'or' }, { value: 'no' }],
        [
          { value: 'yes', text: 'Translated yes', hint: 'Translated hint' },
          { divider: 'or' },
          { value: 'no', text: 'Translated no' },
        ],
        option => option.value === 'yes',
        mockNunjucksEnv
      );

      expect(result).toEqual([
        { value: 'yes', text: 'Yes', hint: { text: 'Translated hint' }, checked: true },
        { divider: 'or' },
        { value: 'no', text: 'Translated no', checked: false },
      ]);
    });

    it('should fall back to option values when translated options are missing', () => {
      const result = buildSelectionItems(
        [{ value: 'maybe', hint: 'Fallback hint' }],
        undefined,
        () => false,
        mockNunjucksEnv
      );

      expect(result).toEqual([{ value: 'maybe', text: 'maybe', hint: { text: 'Fallback hint' }, checked: false }]);
    });
  });

  it('builds character-count field with componentType and maxlength', () => {
    const field: FormFieldConfig = {
      name: 'details',
      type: 'character-count',
      maxLength: 500,
      translationKey: { label: 'details' },
    };

    const result = buildComponentConfig(buildArgs(field));

    expect(result.componentType).toBe('characterCount');
    expect(result.component.maxlength).toBe(500);
  });

  it('builds radios with divider and conditional HTML from text and subfields', () => {
    const field: FormFieldConfig = {
      name: 'choice',
      type: 'radio',
      translationKey: { label: 'choice' },
      options: [
        {
          value: 'yes',
          text: 'Yes',
          conditionalText: '<p>Help text</p>',
          subFields: {
            details: {
              name: 'details',
              type: 'text',
              component: { name: 'details' },
              componentType: 'input',
            },
          },
        },
        { divider: 'or' },
      ],
    };

    const result = buildComponentConfig(
      buildArgs(field, {
        fieldValue: 'yes',
        translatedOptions: [{ value: 'yes', text: 'Yes' }, { divider: 'or' }],
      })
    );

    const items = result.component.items as Record<string, unknown>[];
    expect(result.componentType).toBe('radios');
    expect(items[0].checked).toBe(true);
    expect(items[0].conditional).toEqual({
      html: '<p>Help text</p>\n<div>Rendered subfields</div>',
    });
    expect(items[1]).toEqual({ divider: 'or' });
    expect(mockNunjucksEnv.render).toHaveBeenCalled();
  });

  it('builds checkboxes and marks checked values using normalized arrays', () => {
    const field: FormFieldConfig = {
      name: 'options',
      type: 'checkbox',
      translationKey: { label: 'options' },
      options: [
        { value: 'one', text: 'One' },
        { value: 'two', text: 'Two' },
      ],
    };

    const result = buildComponentConfig(
      buildArgs(field, {
        fieldValue: [{ 0: 'two' }] as unknown,
        translatedOptions: [
          { value: 'one', text: 'One' },
          { value: 'two', text: 'Two' },
        ],
      })
    );

    const items = result.component.items as Record<string, unknown>[];
    expect(result.componentType).toBe('checkboxes');
    expect(items[0].checked).toBe(false);
    expect(items[1].checked).toBe(true);
  });

  it('falls back to input component type for unknown field types', () => {
    const field = {
      name: 'legacy',
      type: 'postcodeLookup',
      translationKey: { label: 'legacy' },
    } as unknown as FormFieldConfig;

    const result = buildComponentConfig(buildArgs(field));

    expect(result.componentType).toBe('input');
  });
});
