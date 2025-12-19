import type { TFunction } from 'i18next';

import type {
  ComponentConfig,
  ComponentType,
  FormFieldConfig,
  FormFieldOption,
} from '../../../interfaces/formFieldConfig.interface';

function createFieldsetLegend(
  label: string,
  isFirstField: boolean
): { legend: { text: string; isPageHeading: boolean; classes: string } } {
  return {
    legend: {
      text: label,
      isPageHeading: isFirstField,
      classes: isFirstField ? 'govuk-fieldset__legend--l' : '',
    },
  };
}

export function buildComponentConfig(
  field: FormFieldConfig,
  label: string,
  hint: string | undefined,
  fieldValue: unknown,
  translatedOptions: { value: string; text: string }[] | undefined,
  hasError: boolean,
  errorText: string | undefined,
  index: number,
  hasTitle: boolean,
  t: TFunction
): ComponentConfig {
  const isFirstField = index === 0 && !hasTitle;
  const component: Record<string, unknown> = {
    id: field.name,
    name: field.name,
    label: { text: label },
    hint: hint ? { text: hint } : null,
    errorMessage: hasError && errorText ? { text: errorText } : null,
    classes: field.classes || (field.type === 'text' ? 'govuk-!-width-three-quarters' : undefined),
    attributes: field.attributes || {},
  };

  let componentType: ComponentType;

  switch (field.type) {
    case 'text': {
      component.value = (fieldValue as string) || '';
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
        isPageHeading: isFirstField,
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
      component.fieldset = createFieldsetLegend(label, isFirstField);

      // Build items with conditional content and subFields support
      component.items =
        field.options?.map((option: FormFieldOption, optionIndex: number) => {
          const item: Record<string, unknown> = {
            value: option.value,
            text: option.text || translatedOptions?.[optionIndex]?.text || option.value,
            checked: radioValue === option.value,
          };

          // Add conditional content if provided (already processed in fieldTranslation)
          if (option.conditionalText && typeof option.conditionalText === 'string') {
            item.conditional = {
              html: option.conditionalText,
            };
          }

          // Add subFields configuration for template rendering
          if (option.subFields) {
            item.subFields = option.subFields;
          }

          return item;
        }) || [];

      componentType = 'radios';
      break;
    }
    case 'checkbox': {
      const checkboxValue = (fieldValue as unknown) || [];
      const checkboxArray =
        Array.isArray(checkboxValue) && typeof checkboxValue !== 'string'
          ? checkboxValue
          : checkboxValue
            ? [checkboxValue]
            : [];
      component.fieldset = createFieldsetLegend(label, isFirstField);

      // Build items with conditional content and subFields support
      component.items =
        field.options?.map((option: FormFieldOption, optionIndex: number) => {
          const item: Record<string, unknown> = {
            value: option.value,
            text: option.text || translatedOptions?.[optionIndex]?.text || option.value,
            checked: checkboxArray.includes(option.value),
          };

          // Add conditional content if provided (already processed in fieldTranslation)
          if (option.conditionalText && typeof option.conditionalText === 'string') {
            item.conditional = {
              html: option.conditionalText,
            };
          }

          // Add subFields configuration for template rendering
          if (option.subFields) {
            item.subFields = option.subFields;
          }

          return item;
        }) || [];

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
      component.fieldset = createFieldsetLegend(label, isFirstField);
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
