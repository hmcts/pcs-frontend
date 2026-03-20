import type { Environment } from 'nunjucks';

import type { FormFieldConfig } from '../../../../../main/interfaces/formFieldConfig.interface';
import { buildComponentConfig } from '../../../../../main/modules/steps/formBuilder/componentBuilders';

describe('componentBuilders', () => {
  const mockT = ((key: string, defaultValue?: string | Record<string, unknown>) => {
    const translations: Record<string, unknown> = {
      'date.day': 'Day',
      'date.month': 'Month',
      'date.year': 'Year',
      characterCount: {
        charactersUnderLimitText: {
          one: 'You have 1 character remaining',
          other: 'You have %{count} characters remaining',
        },
        charactersAtLimitText: 'You have 0 characters remaining',
        charactersOverLimitText: {
          one: 'You have 1 character too many',
          other: 'You have %{count} characters too many',
        },
      },
    };
    return translations[key] || defaultValue || key;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

  const mockRenderString = jest.fn((template: string) => `<div>${template}</div>`);
  const mockNunjucksEnv = {
    renderString: mockRenderString,
  } as unknown as Environment;

  beforeEach(() => {
    mockRenderString.mockClear();
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
          field,
          'First name',
          'Enter your first name',
          'John',
          undefined,
          false,
          undefined,
          0,
          false,
          mockT,
          mockNunjucksEnv
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
          field,
          'Amount',
          undefined,
          '100.00',
          undefined,
          false,
          undefined,
          0,
          false,
          mockT,
          mockNunjucksEnv
        );

        expect(result.component.prefix).toEqual({ text: '£' });
        expect(result.component.value).toBe('100.00');
      });

      it('should handle empty text value', () => {
        const field: FormFieldConfig = {
          name: 'testField',
          type: 'text',
        };

        const result = buildComponentConfig(
          field,
          'Test',
          undefined,
          undefined,
          undefined,
          false,
          undefined,
          0,
          false,
          mockT,
          mockNunjucksEnv
        );

        expect(result.component.value).toBe('');
      });

      it('should include error message when hasError is true', () => {
        const field: FormFieldConfig = {
          name: 'testField',
          type: 'text',
        };

        const result = buildComponentConfig(
          field,
          'Test',
          undefined,
          '',
          undefined,
          true,
          'This field is required',
          0,
          false,
          mockT,
          mockNunjucksEnv
        );

        expect(result.component.errorMessage).toEqual({ text: 'This field is required' });
      });

      it('should include custom classes when provided', () => {
        const field: FormFieldConfig = {
          name: 'testField',
          type: 'text',
          classes: 'govuk-input--width-10',
        };

        const result = buildComponentConfig(
          field,
          'Test',
          undefined,
          '',
          undefined,
          false,
          undefined,
          0,
          false,
          mockT,
          mockNunjucksEnv
        );

        expect(result.component.classes).toBe('govuk-input--width-10');
      });

      it('should include custom attributes when provided', () => {
        const field: FormFieldConfig = {
          name: 'email',
          type: 'text',
          attributes: { autocomplete: 'email', spellcheck: false },
        };

        const result = buildComponentConfig(
          field,
          'Email',
          undefined,
          '',
          undefined,
          false,
          undefined,
          0,
          false,
          mockT,
          mockNunjucksEnv
        );

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
          field,
          'Description',
          'Provide details',
          'Some text',
          undefined,
          false,
          undefined,
          0,
          false,
          mockT,
          mockNunjucksEnv
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

        const result = buildComponentConfig(
          field,
          'Notes',
          undefined,
          '',
          undefined,
          false,
          undefined,
          0,
          false,
          mockT,
          mockNunjucksEnv
        );

        expect(result.component.rows).toBe(10);
        expect(result.component.maxlength).toBe(500);
      });
    });

    describe('character-count field', () => {
      it('should build character count component with translations', () => {
        const field: FormFieldConfig = {
          name: 'statement',
          type: 'character-count',
          maxLength: 200,
          labelClasses: 'govuk-label--m',
        };

        const result = buildComponentConfig(
          field,
          'Your statement',
          'Explain your situation',
          'Some text',
          undefined,
          false,
          undefined,
          0,
          false,
          mockT,
          mockNunjucksEnv
        );

        expect(result.componentType).toBe('characterCount');
        expect(result.component.value).toBe('Some text');
        expect(result.component.maxlength).toBe(200);
        expect(result.component.label).toEqual({
          text: 'Your statement',
          isPageHeading: true,
          classes: 'govuk-label--m',
        });
        expect(result.component.charactersUnderLimitText).toBeDefined();
        expect(result.component.charactersAtLimitText).toBeDefined();
        expect(result.component.charactersOverLimitText).toBeDefined();
      });

      it('should handle character count without maxLength', () => {
        const field: FormFieldConfig = {
          name: 'freeText',
          type: 'character-count',
        };

        const result = buildComponentConfig(
          field,
          'Free text',
          undefined,
          '',
          undefined,
          false,
          undefined,
          1,
          true,
          mockT,
          mockNunjucksEnv
        );

        expect(result.component.maxlength).toBeUndefined();
        expect(result.component.charactersUnderLimitText).toBeUndefined();
      });

      it('should handle character count when translation returns string instead of object', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mockTString = jest.fn(() => 'character count string') as any;
        const field: FormFieldConfig = {
          name: 'statement',
          type: 'character-count',
          maxLength: 200,
        };

        const result = buildComponentConfig(
          field,
          'Statement',
          undefined,
          '',
          undefined,
          false,
          undefined,
          0,
          false,
          mockTString,
          mockNunjucksEnv
        );

        expect(result.component.charactersUnderLimitText).toBeUndefined();
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
          field,
          'Make a choice',
          'Select one option',
          'yes',
          [
            { value: 'yes', text: 'Yes' },
            { value: 'no', text: 'No' },
          ],
          false,
          undefined,
          0,
          false,
          mockT,
          mockNunjucksEnv
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
          field,
          'Answer',
          undefined,
          '',
          [{ value: 'yes', text: 'Yes' }, { divider: 'or' }, { value: 'no', text: 'No' }],
          false,
          undefined,
          0,
          false,
          mockT,
          mockNunjucksEnv
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
          field,
          'Do you have details?',
          undefined,
          'yes',
          [
            { value: 'yes', text: 'Yes' },
            { value: 'no', text: 'No' },
          ],
          false,
          undefined,
          0,
          false,
          mockT,
          mockNunjucksEnv
        );

        const firstItem = (result.component.items as unknown[])?.[0] as Record<string, unknown>;
        expect(firstItem.conditional).toEqual({
          html: '<p>Please provide details below</p>',
        });
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
          field,
          'Question',
          undefined,
          '',
          [
            { value: 'yes', text: 'Yes' },
            { value: 'no', text: 'No' },
          ],
          false,
          undefined,
          0,
          false,
          mockT,
          mockNunjucksEnv
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
          field,
          'Select interests',
          undefined,
          ['sports', 'reading'],
          [
            { value: 'sports', text: 'Sports' },
            { value: 'music', text: 'Music' },
            { value: 'reading', text: 'Reading' },
          ],
          false,
          undefined,
          0,
          false,
          mockT,
          mockNunjucksEnv
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
          field,
          'Options',
          undefined,
          [],
          [{ value: 'option1', text: 'Option 1' }, { divider: 'or' }, { value: 'option2', text: 'Option 2' }],
          false,
          undefined,
          0,
          false,
          mockT,
          mockNunjucksEnv
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
          field,
          'Agreement',
          undefined,
          ['agree'],
          [{ value: 'agree', text: 'I agree' }],
          false,
          undefined,
          0,
          false,
          mockT,
          mockNunjucksEnv
        );

        const firstItem = (result.component.items as unknown[])?.[0] as Record<string, unknown>;
        expect(firstItem.conditional).toEqual({
          html: '<p>You have agreed to the terms</p>',
        });
      });

      it('should handle checkbox without conditionalText or subFields', () => {
        const field: FormFieldConfig = {
          name: 'options',
          type: 'checkbox',
          options: [{ value: 'option1', text: 'Option 1' }],
        };

        const result = buildComponentConfig(
          field,
          'Options',
          undefined,
          ['option1'],
          [{ value: 'option1', text: 'Option 1' }],
          false,
          undefined,
          0,
          false,
          mockT,
          mockNunjucksEnv
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
          field,
          'Options',
          undefined,
          undefined,
          [{ value: 'test', text: 'Test' }],
          false,
          undefined,
          0,
          false,
          mockT,
          mockNunjucksEnv
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
          field,
          'Date of birth',
          'For example, 31 3 1980',
          { day: '15', month: '06', year: '1990' },
          undefined,
          false,
          undefined,
          0,
          false,
          mockT,
          mockNunjucksEnv
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

        const result = buildComponentConfig(
          field,
          'Start date',
          undefined,
          undefined,
          undefined,
          false,
          undefined,
          0,
          false,
          mockT,
          mockNunjucksEnv
        );

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
          type: 'postcodeLookup' as 'text', // Cast to bypass TypeScript enum check
        };

        const result = buildComponentConfig(
          field,
          'Unknown field',
          undefined,
          '',
          undefined,
          false,
          undefined,
          0,
          false,
          mockT,
          mockNunjucksEnv
        );

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
          field,
          'Question',
          undefined,
          '',
          [{ value: 'yes', text: 'Yes' }],
          false,
          undefined,
          0,
          false,
          mockT,
          mockNunjucksEnv
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
          field,
          'Question',
          undefined,
          '',
          [{ value: 'yes', text: 'Yes' }],
          false,
          undefined,
          1,
          false,
          mockT,
          mockNunjucksEnv
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
          field,
          'Question',
          undefined,
          '',
          [{ value: 'yes', text: 'Yes' }],
          false,
          undefined,
          0,
          true,
          mockT,
          mockNunjucksEnv
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
          field,
          'Question',
          undefined,
          '',
          [{ value: 'yes', text: 'Yes' }],
          false,
          undefined,
          0,
          false,
          mockT,
          mockNunjucksEnv
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
