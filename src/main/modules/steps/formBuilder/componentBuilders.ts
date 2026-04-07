import type { TFunction } from 'i18next';
import type { Environment } from 'nunjucks';

import type {
  ComponentConfig,
  ComponentType,
  FormFieldConfig,
  FormFieldOption,
} from '../../../interfaces/formFieldConfig.interface';

import { normalizeCheckboxValue } from './helpers';
import { buildSubFieldsHTML } from './subFieldsRenderer';

function createFieldsetLegend(
  label: string,
  isFirstField: boolean,
  legendClasses?: string,
  isPageHeading?: boolean
): { legend: { text: string; isPageHeading: boolean; classes: string } } {
  return {
    legend: {
      text: label,
      isPageHeading: isPageHeading || false,
      classes: legendClasses || (isFirstField ? 'govuk-fieldset__legend--l' : ''),
    },
  };
}

export function buildConditionalItemContent(option: FormFieldOption, nunjucksEnv: Environment): string | undefined {
  const conditionalParts: string[] = [];

  if (option.conditionalText && typeof option.conditionalText === 'string') {
    conditionalParts.push(option.conditionalText);
  }

  if (option.subFields) {
    const subFieldsHTML = buildSubFieldsHTML(option.subFields, nunjucksEnv);
    if (subFieldsHTML) {
      conditionalParts.push(subFieldsHTML);
    }
  }

  return conditionalParts.length > 0 ? conditionalParts.join('\n') : undefined;
}

export function buildSelectionItems(
  options: FormFieldOption[] | undefined,
  translatedOptions: { value?: string; text?: string; hint?: string; divider?: string }[] | undefined,
  isChecked: (option: FormFieldOption) => boolean,
  nunjucksEnv: Environment
): Record<string, unknown>[] {
  return (
    options?.map((option: FormFieldOption, optionIndex: number) => {
      if (option.divider) {
        return translatedOptions?.[optionIndex] || { divider: option.divider };
      }

      const item: Record<string, unknown> = {
        value: option.value,
        text: option.text || translatedOptions?.[optionIndex]?.text || option.value,
        checked: isChecked(option),
      };
      const itemHint = translatedOptions?.[optionIndex]?.hint || option.hint;
      if (itemHint) {
        item.hint = { text: itemHint };
      }

      const conditionalHtml = buildConditionalItemContent(option, nunjucksEnv);
      if (conditionalHtml) {
        item.conditional = { html: conditionalHtml };
      }

      return item;
    }) || []
  );
}

export function buildComponentConfig(
  field: FormFieldConfig,
  label: string,
  hint: string | undefined,
  fieldValue: unknown,
  translatedOptions: { value?: string; text?: string; hint?: string; divider?: string }[] | undefined,
  hasError: boolean,
  errorText: string | undefined,
  index: number,
  hasTitle: boolean,
  t: TFunction,
  nunjucksEnv: Environment
): ComponentConfig {
  const isFirstField = index === 0 && !hasTitle;
  const component: Record<string, unknown> = {
    id: field.name,
    name: field.name,
    label: { text: label, classes: field.labelClasses },
    hint: hint ? { text: hint } : null,
    errorMessage: hasError && errorText ? { text: errorText } : null,
    classes: field.classes || (field.type === 'text' ? 'govuk-!-width-three-quarters' : undefined),
    attributes: field.attributes || {},
  };

  let componentType: ComponentType;

  switch (field.type) {
    case 'text': {
      component.value = (fieldValue as string) || '';
      if (field.prefix) {
        component.prefix = field.prefix;
      }
      componentType = 'input';
      break;
    }
    case 'textarea': {
      const textareaAttributes = field.attributes || {};
      component.value = (fieldValue as string) || '';
      component.rows = textareaAttributes.rows || 5;
      component.maxlength = field.maxLength || null;
      component.attributes = textareaAttributes;
      componentType = 'textarea';
      break;
    }
    case 'character-count': {
      const charCountAttributes = field.attributes || {};
      component.value = (fieldValue as string) || '';
      component.rows = charCountAttributes.rows || 5;
      component.maxlength = field.maxLength;
      component.attributes = charCountAttributes;
      component.label = {
        text: label,
        isPageHeading: field.isPageHeading,
        classes: field.labelClasses,
      };

      // Add translated character count messages
      // i18next handles pluralization via the 'one' and 'other' keys in the translation object
      // The GOV.UK component will use these keys to select the correct plural form
      if (field.maxLength) {
        const characterCount = t('characterCount', { returnObjects: true }) as Record<string, unknown> | string;
        if (characterCount && typeof characterCount === 'object') {
          Object.assign(component, {
            charactersUnderLimitText: characterCount.charactersUnderLimitText,
            charactersAtLimitText: characterCount.charactersAtLimitText,
            charactersOverLimitText: characterCount.charactersOverLimitText,
          });
        }
      }

      componentType = 'characterCount';
      break;
    }
    case 'radio': {
      const radioValue = (fieldValue as string) || '';
      component.fieldset = createFieldsetLegend(label, isFirstField, field.legendClasses, field.isPageHeading);
      component.items = buildSelectionItems(
        field.options,
        translatedOptions,
        option => radioValue === option.value,
        nunjucksEnv
      );

      componentType = 'radios';
      break;
    }
    case 'checkbox': {
      // Normalize checkbox value to handle edge case: [{ '0': 'value1', '1': 'value2' }]
      // This ensures checkbox values are always in the correct format for rendering
      const checkboxArray = normalizeCheckboxValue(fieldValue);
      component.fieldset = createFieldsetLegend(label, isFirstField, field.legendClasses);
      component.items = buildSelectionItems(
        field.options,
        translatedOptions,
        option => (option.value ? checkboxArray.includes(option.value) : false),
        nunjucksEnv
      );

      componentType = 'checkboxes';
      break;
    }
    case 'date': {
      const dateValue = (fieldValue as { day?: string; month?: string; year?: string }) || {
        day: '',
        month: '',
        year: '',
      };
      component.namePrefix = field.name;
      component.idPrefix = field.name;
      component.fieldset = createFieldsetLegend(label, isFirstField, field.legendClasses);
      component.items = [
        {
          name: 'day',
          label: t('date.day', 'Day'),
          value: dateValue.day || '',
          classes: 'govuk-input--width-2',
          attributes: { maxlength: 2, inputmode: 'numeric' },
        },
        {
          name: 'month',
          label: t('date.month', 'Month'),
          value: dateValue.month || '',
          classes: 'govuk-input--width-2',
          attributes: { maxlength: 2, inputmode: 'numeric' },
        },
        {
          name: 'year',
          label: t('date.year', 'Year'),
          value: dateValue.year || '',
          classes: 'govuk-input--width-4',
          attributes: { maxlength: 4, inputmode: 'numeric' },
        },
      ];
      componentType = 'dateInput';
      break;
    }
    default:
      componentType = 'input';
  }

  return { component, componentType };
}
