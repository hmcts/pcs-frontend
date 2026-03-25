import type { TFunction } from 'i18next';
import type { Environment } from 'nunjucks';

import type { FormFieldConfig } from '../../../../../main/interfaces/formFieldConfig.interface';
import { buildComponentConfig } from '../../../../../main/modules/steps/formBuilder/componentBuilders';

describe('componentBuilders', () => {
  const mockNunjucksEnv = {
    render: jest.fn(() => '<div>subfields</div>'),
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
      html: '<p>Help text</p>\n<div>subfields</div>',
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

  it('passes hintClasses onto the GOV.UK hint object for text inputs', () => {
    const field: FormFieldConfig = {
      name: 'amount',
      type: 'text',
      translationKey: { label: 'amount' },
      hintClasses: 'govuk-!-margin-bottom-1',
    };

    const result = buildComponentConfig(
      buildArgs(field, {
        hint: 'Enter a number',
      })
    );

    expect(result.component.hint).toEqual({
      text: 'Enter a number',
      classes: 'govuk-!-margin-bottom-1',
    });
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
