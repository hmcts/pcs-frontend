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
    t: ((key: string, options?: Record<string, unknown>) => {
      if (key === 'characterCount' && options?.returnObjects) {
        return {
          charactersUnderLimitText: 'You have %{count} characters remaining',
          charactersAtLimitText: 'You have reached the character limit',
          charactersOverLimitText: 'You have %{count} characters too many',
        };
      }

      if (key === 'custom.counter.copy') {
        return 'Custom counter copy';
      }

      return key;
    }) as unknown as TFunction,
    nunjucksEnv: mockNunjucksEnv,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies default character-count translation object messages', () => {
    const field: FormFieldConfig = {
      name: 'details',
      type: 'character-count',
      maxLength: 500,
      translationKey: { label: 'details' },
    };

    const result = buildComponentConfig(buildArgs(field));

    expect(result.componentType).toBe('characterCount');
    expect(result.component.charactersUnderLimitText).toBe('You have %{count} characters remaining');
    expect(result.component.charactersAtLimitText).toBe('You have reached the character limit');
    expect(result.component.charactersOverLimitText).toBe('You have %{count} characters too many');
  });

  it('applies static character-count message when characterCountMessageKey resolves', () => {
    const field: FormFieldConfig = {
      name: 'details',
      type: 'character-count',
      maxLength: 500,
      characterCountMessageKey: 'custom.counter.copy',
      translationKey: { label: 'details' },
    };

    const result = buildComponentConfig(buildArgs(field));

    expect(result.component.textareaDescriptionText).toBe('Custom counter copy');
    expect(result.component.charactersUnderLimitText).toEqual({
      one: 'Custom counter copy',
      other: 'Custom counter copy',
    });
    expect(result.component.charactersAtLimitText).toBe('Custom counter copy');
    expect(result.component.charactersOverLimitText).toEqual({
      one: 'Custom counter copy',
      other: 'Custom counter copy',
    });
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
