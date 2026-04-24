import type { TFunction } from 'i18next';
import type { Environment } from 'nunjucks';

import {
  buildComponentConfig,
  buildConditionalItemContent,
  buildSelectionItems,
} from '../../../../../main/modules/steps/formBuilder/componentBuilders';

import type { FormFieldConfig, FormFieldOption } from '@modules/steps/formBuilder/formFieldConfig.interface';

describe('componentBuilders', () => {
  const mockT = ((key: string, defaultValue?: string | Record<string, unknown>) => {
    const translations: Record<string, unknown> = {
      'date.day': 'Day',
      'date.month': 'Month',
      'date.year': 'Year',
    };
    return translations[key] || defaultValue || key;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

  const mockRenderString = jest.fn((template: string) => `<div>${template}</div>`);
  const mockRender = jest.fn(() => '<div>Rendered subfields</div>');
  const mockNunjucksEnv = {
    render: mockRender,
    renderString: mockRenderString,
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
    t: mockT as unknown as TFunction,
    nunjucksEnv: mockNunjucksEnv,
    ...overrides,
  });

  beforeEach(() => {
    mockRender.mockClear();
    mockRenderString.mockClear();
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

  describe('buildComponentConfig', () => {
    describe('text field', () => {
      it('should build basic text input component', () => {
        const field: FormFieldConfig = {
          name: 'firstName',
          type: 'text',
          labelClasses: 'govuk-label--s',
        };

        const result = buildComponentConfig(
          buildArgs(field, {
            label: 'First name',
            hint: 'Enter your first name',
            fieldValue: 'John',
          })
        );

        expect(result.componentType).toBe('input');
        expect(result.component).toMatchObject({
          id: 'firstName',
          name: 'firstName',
          label: { text: 'First name', classes: 'govuk-label--s' },
          hint: { text: 'Enter your first name' },
          value: 'John',
          classes: 'govuk-!-width-three-quarters',
          errorMessage: null,
        });
      });

      it('should build text input with prefix (e.g., currency symbol)', () => {
        const field: FormFieldConfig = {
          name: 'amount',
          type: 'text',
          prefix: { text: '£' },
        };

        const result = buildComponentConfig(
          buildArgs(field, {
            label: 'Amount',
            fieldValue: '100.00',
          })
        );

        expect(result.component.prefix).toEqual({ text: '£' });
        expect(result.component.value).toBe('100.00');
      });

      it('should handle empty text value', () => {
        const field: FormFieldConfig = {
          name: 'testField',
          type: 'text',
        };

        const result = buildComponentConfig(buildArgs(field, { label: 'Test' }));

        expect(result.component.value).toBe('');
      });

      it('should include error message when hasError is true', () => {
        const field: FormFieldConfig = {
          name: 'testField',
          type: 'text',
        };

        const result = buildComponentConfig(
          buildArgs(field, {
            label: 'Test',
            fieldValue: '',
            hasError: true,
            errorText: 'This field is required',
          })
        );

        expect(result.component.errorMessage).toEqual({ text: 'This field is required' });
      });

      it('should include custom classes when provided', () => {
        const field: FormFieldConfig = {
          name: 'testField',
          type: 'text',
          classes: 'govuk-input--width-10',
        };

        const result = buildComponentConfig(buildArgs(field, { label: 'Test', fieldValue: '' }));

        expect(result.component.classes).toBe('govuk-input--width-10');
      });

      it('should include custom attributes when provided', () => {
        const field: FormFieldConfig = {
          name: 'email',
          type: 'text',
          attributes: { autocomplete: 'email', spellcheck: false },
        };

        const result = buildComponentConfig(buildArgs(field, { label: 'Email', fieldValue: '' }));

        expect(result.component.attributes).toEqual({ autocomplete: 'email', spellcheck: false });
      });
    });

    describe('textarea field', () => {
      it('should build textarea component with default rows', () => {
        const field: FormFieldConfig = {
          name: 'description',
          type: 'textarea',
        };

        const result = buildComponentConfig(
          buildArgs(field, {
            label: 'Description',
            hint: 'Provide details',
            fieldValue: 'Some text',
          })
        );

        expect(result.componentType).toBe('textarea');
        expect(result.component.value).toBe('Some text');
        expect(result.component.rows).toBe(5);
        expect(result.component.maxlength).toBeNull();
      });

      it('should build textarea with custom rows and maxlength', () => {
        const field: FormFieldConfig = {
          name: 'notes',
          type: 'textarea',
          maxLength: 500,
          attributes: { rows: 10 },
        };

        const result = buildComponentConfig(buildArgs(field, { label: 'Notes', fieldValue: '' }));

        expect(result.component.rows).toBe(10);
        expect(result.component.maxlength).toBe(500);
      });
    });

    describe('character-count field', () => {
      it('should build character count component with maxlength', () => {
        const field: FormFieldConfig = {
          name: 'statement',
          type: 'character-count',
          maxLength: 200,
          labelClasses: 'govuk-label--m',
          isPageHeading: true,
        };

        const result = buildComponentConfig(
          buildArgs(field, {
            label: 'Your statement',
            hint: 'Explain your situation',
            fieldValue: 'Some text',
          })
        );

        expect(result.componentType).toBe('characterCount');
        expect(result.component.value).toBe('Some text');
        expect(result.component.maxlength).toBe(200);
        expect(result.component.label).toEqual({
          text: 'Your statement',
          isPageHeading: true,
          classes: 'govuk-label--m',
        });
      });

      it('should handle character count without maxLength', () => {
        const field: FormFieldConfig = {
          name: 'freeText',
          type: 'character-count',
        };

        const result = buildComponentConfig(
          buildArgs(field, {
            label: 'Free text',
            fieldValue: '',
            index: 1,
            hasTitle: true,
          })
        );

        expect(result.component.maxlength).toBeUndefined();
      });
    });

    describe('radio field', () => {
      it('should build radio component with checked value', () => {
        const field: FormFieldConfig = {
          name: 'choice',
          type: 'radio',
          legendClasses: 'govuk-fieldset__legend--m',
          options: [
            { value: 'yes', text: 'Yes' },
            { value: 'no', text: 'No' },
          ],
        };

        const result = buildComponentConfig(
          buildArgs(field, {
            label: 'Make a choice',
            hint: 'Select one option',
            fieldValue: 'yes',
            translatedOptions: [
              { value: 'yes', text: 'Yes' },
              { value: 'no', text: 'No' },
            ],
          })
        );

        expect(result.componentType).toBe('radios');
        expect(result.component.fieldset).toEqual({
          legend: {
            text: 'Make a choice',
            isPageHeading: false,
            classes: 'govuk-fieldset__legend--m',
          },
        });
        expect(result.component.items).toEqual([
          { value: 'yes', text: 'Yes', checked: true },
          { value: 'no', text: 'No', checked: false },
        ]);
      });

      it('should build radio with divider', () => {
        const field: FormFieldConfig = {
          name: 'answer',
          type: 'radio',
          options: [{ value: 'yes', text: 'Yes' }, { divider: 'or' }, { value: 'no', text: 'No' }],
        };

        const result = buildComponentConfig(
          buildArgs(field, {
            label: 'Answer',
            fieldValue: '',
            translatedOptions: [{ value: 'yes', text: 'Yes' }, { divider: 'or' }, { value: 'no', text: 'No' }],
          })
        );

        expect((result.component.items as unknown[])?.[1]).toEqual({ divider: 'or' });
      });

      it('should build radio with conditional text', () => {
        const field: FormFieldConfig = {
          name: 'hasDetails',
          type: 'radio',
          options: [
            { value: 'yes', text: 'Yes', conditionalText: '<p>Please provide details below</p>' },
            { value: 'no', text: 'No' },
          ],
        };

        const result = buildComponentConfig(
          buildArgs(field, {
            label: 'Do you have details?',
            fieldValue: 'yes',
            translatedOptions: [
              { value: 'yes', text: 'Yes' },
              { value: 'no', text: 'No' },
            ],
          })
        );

        const firstItem = (result.component.items as unknown[])?.[0] as Record<string, unknown>;
        expect(firstItem.conditional).toEqual({
          html: '<p>Please provide details below</p>',
        });
      });

      it('should build radio with option hints', () => {
        const field: FormFieldConfig = {
          name: 'choice',
          type: 'radio',
          options: [
            { value: 'yes', text: 'Yes', hint: 'This includes advice from a solicitor.' },
            { value: 'no', text: 'No' },
          ],
        };

        const result = buildComponentConfig(
          buildArgs(field, {
            label: 'Make a choice',
            fieldValue: 'yes',
            translatedOptions: [
              { value: 'yes', text: 'Yes', hint: 'This includes advice from a solicitor.' },
              { value: 'no', text: 'No' },
            ],
          })
        );

        expect(result.component.items).toEqual([
          { value: 'yes', text: 'Yes', hint: { text: 'This includes advice from a solicitor.' }, checked: true },
          { value: 'no', text: 'No', checked: false },
        ]);
      });

      it('should handle radio options without conditionalText or subFields', () => {
        const field: FormFieldConfig = {
          name: 'answer',
          type: 'radio',
          options: [
            { value: 'yes', text: 'Yes' },
            { value: 'no', text: 'No' },
          ],
        };

        const result = buildComponentConfig(
          buildArgs(field, {
            label: 'Question',
            fieldValue: '',
            translatedOptions: [
              { value: 'yes', text: 'Yes' },
              { value: 'no', text: 'No' },
            ],
          })
        );

        const firstItem = (result.component.items as unknown[])?.[0] as Record<string, unknown>;
        expect(firstItem.conditional).toBeUndefined();
      });
    });

    describe('checkbox field', () => {
      it('should build checkbox component with checked values', () => {
        const field: FormFieldConfig = {
          name: 'interests',
          type: 'checkbox',
          legendClasses: 'govuk-fieldset__legend--m',
          options: [
            { value: 'sports', text: 'Sports' },
            { value: 'music', text: 'Music' },
            { value: 'reading', text: 'Reading' },
          ],
        };

        const result = buildComponentConfig(
          buildArgs(field, {
            label: 'Select interests',
            fieldValue: ['sports', 'reading'],
            translatedOptions: [
              { value: 'sports', text: 'Sports' },
              { value: 'music', text: 'Music' },
              { value: 'reading', text: 'Reading' },
            ],
          })
        );

        expect(result.componentType).toBe('checkboxes');
        expect(result.component.items).toEqual([
          { value: 'sports', text: 'Sports', checked: true },
          { value: 'music', text: 'Music', checked: false },
          { value: 'reading', text: 'Reading', checked: true },
        ]);
      });

      it('should build checkbox with divider', () => {
        const field: FormFieldConfig = {
          name: 'options',
          type: 'checkbox',
          options: [{ value: 'option1', text: 'Option 1' }, { divider: 'or' }, { value: 'option2', text: 'Option 2' }],
        };

        const result = buildComponentConfig(
          buildArgs(field, {
            label: 'Options',
            fieldValue: [],
            translatedOptions: [
              { value: 'option1', text: 'Option 1' },
              { divider: 'or' },
              { value: 'option2', text: 'Option 2' },
            ],
          })
        );

        expect((result.component.items as unknown[])?.[1]).toEqual({ divider: 'or' });
      });

      it('should build checkbox with conditional text', () => {
        const field: FormFieldConfig = {
          name: 'agreement',
          type: 'checkbox',
          options: [{ value: 'agree', text: 'I agree', conditionalText: '<p>You have agreed to the terms</p>' }],
        };

        const result = buildComponentConfig(
          buildArgs(field, {
            label: 'Agreement',
            fieldValue: ['agree'],
            translatedOptions: [{ value: 'agree', text: 'I agree' }],
          })
        );

        const firstItem = (result.component.items as unknown[])?.[0] as Record<string, unknown>;
        expect(firstItem.conditional).toEqual({
          html: '<p>You have agreed to the terms</p>',
        });
      });

      it('should build checkbox with option hints', () => {
        const field: FormFieldConfig = {
          name: 'agreement',
          type: 'checkbox',
          options: [
            { value: 'agree', text: 'I agree', hint: 'This means you accept the terms.' },
            { value: 'updates', text: 'Send me updates' },
          ],
        };

        const result = buildComponentConfig(
          buildArgs(field, {
            label: 'Agreement',
            fieldValue: ['agree'],
            translatedOptions: [
              { value: 'agree', text: 'I agree', hint: 'This means you accept the terms.' },
              { value: 'updates', text: 'Send me updates' },
            ],
          })
        );

        expect(result.component.items).toEqual([
          { value: 'agree', text: 'I agree', hint: { text: 'This means you accept the terms.' }, checked: true },
          { value: 'updates', text: 'Send me updates', checked: false },
        ]);
      });

      it('should handle checkbox without conditionalText or subFields', () => {
        const field: FormFieldConfig = {
          name: 'options',
          type: 'checkbox',
          options: [{ value: 'option1', text: 'Option 1' }],
        };

        const result = buildComponentConfig(
          buildArgs(field, {
            label: 'Options',
            fieldValue: ['option1'],
            translatedOptions: [{ value: 'option1', text: 'Option 1' }],
          })
        );

        const firstItem = (result.component.items as unknown[])?.[0] as Record<string, unknown>;
        expect(firstItem.conditional).toBeUndefined();
      });

      it('should handle checkbox with no value', () => {
        const field: FormFieldConfig = {
          name: 'options',
          type: 'checkbox',
          options: [{ value: 'test', text: 'Test' }],
        };

        const result = buildComponentConfig(
          buildArgs(field, {
            label: 'Options',
            translatedOptions: [{ value: 'test', text: 'Test' }],
          })
        );

        const firstItem = (result.component.items as unknown[])?.[0] as Record<string, unknown>;
        expect(firstItem.checked).toBe(false);
      });
    });

    describe('date field', () => {
      it('should build date component with values', () => {
        const field: FormFieldConfig = {
          name: 'dateOfBirth',
          type: 'date',
          legendClasses: 'govuk-fieldset__legend--m',
        };

        const result = buildComponentConfig(
          buildArgs(field, {
            label: 'Date of birth',
            hint: 'For example, 31 3 1980',
            fieldValue: { day: '15', month: '06', year: '1990' },
          })
        );

        expect(result.componentType).toBe('dateInput');
        expect(result.component.namePrefix).toBe('dateOfBirth');
        expect(result.component.idPrefix).toBe('dateOfBirth');
        expect(result.component.fieldset).toEqual({
          legend: {
            text: 'Date of birth',
            isPageHeading: false,
            classes: 'govuk-fieldset__legend--m',
          },
        });
        expect(result.component.items).toEqual([
          {
            name: 'day',
            label: 'Day',
            value: '15',
            classes: 'govuk-input--width-2',
            attributes: { maxlength: 2, inputmode: 'numeric' },
          },
          {
            name: 'month',
            label: 'Month',
            value: '06',
            classes: 'govuk-input--width-2',
            attributes: { maxlength: 2, inputmode: 'numeric' },
          },
          {
            name: 'year',
            label: 'Year',
            value: '1990',
            classes: 'govuk-input--width-4',
            attributes: { maxlength: 4, inputmode: 'numeric' },
          },
        ]);
      });

      it('should build date component with empty values', () => {
        const field: FormFieldConfig = {
          name: 'startDate',
          type: 'date',
        };

        const result = buildComponentConfig(buildArgs(field, { label: 'Start date' }));

        expect(result.component.items).toEqual([
          {
            name: 'day',
            label: 'Day',
            value: '',
            classes: 'govuk-input--width-2',
            attributes: { maxlength: 2, inputmode: 'numeric' },
          },
          {
            name: 'month',
            label: 'Month',
            value: '',
            classes: 'govuk-input--width-2',
            attributes: { maxlength: 2, inputmode: 'numeric' },
          },
          {
            name: 'year',
            label: 'Year',
            value: '',
            classes: 'govuk-input--width-4',
            attributes: { maxlength: 4, inputmode: 'numeric' },
          },
        ]);
      });
    });

    describe('default case', () => {
      it('should default to input componentType for unknown field type', () => {
        const field: FormFieldConfig = {
          name: 'unknown',
          type: 'postcodeLookup' as 'text',
        };

        const result = buildComponentConfig(buildArgs(field, { label: 'Unknown field', fieldValue: '' }));

        expect(result.componentType).toBe('input');
      });
    });

    describe('legend and heading behavior', () => {
      it('should set isPageHeading to true for first field when no title', () => {
        const field: FormFieldConfig = {
          name: 'question',
          type: 'radio',
          options: [{ value: 'yes', text: 'Yes' }],
        };

        const result = buildComponentConfig(
          buildArgs(field, {
            label: 'Question',
            fieldValue: '',
            translatedOptions: [{ value: 'yes', text: 'Yes' }],
          })
        );

        expect(result.component.fieldset).toEqual({
          legend: {
            text: 'Question',
            isPageHeading: false,
            classes: 'govuk-fieldset__legend--l',
          },
        });
      });

      it('should not set large legend class when not first field', () => {
        const field: FormFieldConfig = {
          name: 'question',
          type: 'radio',
          options: [{ value: 'yes', text: 'Yes' }],
        };

        const result = buildComponentConfig(
          buildArgs(field, {
            label: 'Question',
            fieldValue: '',
            translatedOptions: [{ value: 'yes', text: 'Yes' }],
            index: 1,
          })
        );

        expect(result.component.fieldset).toEqual({
          legend: {
            text: 'Question',
            isPageHeading: false,
            classes: '',
          },
        });
      });

      it('should not set large legend class when page has title', () => {
        const field: FormFieldConfig = {
          name: 'question',
          type: 'radio',
          options: [{ value: 'yes', text: 'Yes' }],
        };

        const result = buildComponentConfig(
          buildArgs(field, {
            label: 'Question',
            fieldValue: '',
            translatedOptions: [{ value: 'yes', text: 'Yes' }],
            hasTitle: true,
          })
        );

        expect(result.component.fieldset).toEqual({
          legend: {
            text: 'Question',
            isPageHeading: false,
            classes: '',
          },
        });
      });

      it('should use custom legendClasses when provided', () => {
        const field: FormFieldConfig = {
          name: 'question',
          type: 'radio',
          legendClasses: 'govuk-fieldset__legend--s',
          options: [{ value: 'yes', text: 'Yes' }],
        };

        const result = buildComponentConfig(
          buildArgs(field, {
            label: 'Question',
            fieldValue: '',
            translatedOptions: [{ value: 'yes', text: 'Yes' }],
          })
        );

        expect(result.component.fieldset).toEqual({
          legend: {
            text: 'Question',
            isPageHeading: false,
            classes: 'govuk-fieldset__legend--s',
          },
        });
      });
    });
  });
});
