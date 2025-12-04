import type { TFunction } from 'i18next';

import type { ComponentConfig, ComponentType, FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';

function getCharacterCountTranslations(t: TFunction):
  | {
      charactersUnderLimitText?: { one: string; other: string };
      charactersAtLimitText?: string;
      charactersOverLimitText?: { one: string; other: string };
    }
  | undefined {
  try {
    const characterCount = t('characterCount', { returnObjects: true }) as Record<string, unknown> | string;

    // If t() returns a string (key not found), return undefined
    if (typeof characterCount === 'string' || !characterCount) {
      return undefined;
    }

    return {
      charactersUnderLimitText: characterCount.charactersUnderLimitText as { one: string; other: string } | undefined,
      charactersAtLimitText: characterCount.charactersAtLimitText as string | undefined,
      charactersOverLimitText: characterCount.charactersOverLimitText as { one: string; other: string } | undefined,
    };
  } catch {
    return undefined;
  }
}

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
      if (field.maxLength) {
        const characterCountTranslations = getCharacterCountTranslations(t);
        if (characterCountTranslations) {
          if (characterCountTranslations.charactersUnderLimitText) {
            component.charactersUnderLimitText = characterCountTranslations.charactersUnderLimitText;
          }
          if (characterCountTranslations.charactersAtLimitText) {
            component.charactersAtLimitText = characterCountTranslations.charactersAtLimitText;
          }
          if (characterCountTranslations.charactersOverLimitText) {
            component.charactersOverLimitText = characterCountTranslations.charactersOverLimitText;
          }
        }
      }

      componentType = 'characterCount';
      break;
    }
    case 'radio': {
      const radioValue = (fieldValue as string) || '';
      component.fieldset = createFieldsetLegend(label, isFirstField);
      component.items =
        translatedOptions?.map(option => ({
          value: option.value,
          text: option.text,
          checked: radioValue === option.value,
        })) || [];
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
      component.items =
        translatedOptions?.map(option => ({
          value: option.value,
          text: option.text,
          checked: checkboxArray.includes(option.value),
        })) || [];
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
      component.fieldset = createFieldsetLegend(label, isFirstField);
      component.items = [
        {
          name: 'day',
          label: t('date.day') || 'Day',
          value: dateValue.day || '',
          classes: 'govuk-input--width-2',
          attributes: { maxlength: 2, inputmode: 'numeric' },
        },
        {
          name: 'month',
          label: t('date.month') || 'Month',
          value: dateValue.month || '',
          classes: 'govuk-input--width-2',
          attributes: { maxlength: 2, inputmode: 'numeric' },
        },
        {
          name: 'year',
          label: t('date.year') || 'Year',
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
