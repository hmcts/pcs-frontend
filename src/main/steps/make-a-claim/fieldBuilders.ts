import { FIELD_LIMITS } from './fieldLimits';
import { amountValidator } from './formValues';

import type { FormFieldConfig, FormFieldOption } from '@modules/steps/formBuilder/formFieldConfig.interface';

const PAGE_LEGEND = 'govuk-fieldset__legend--l';

/** A question asked as the page's heading, answered from `options` (keys under the step's `options.`). */
export function radioQuestion(
  name: string,
  values: readonly string[],
  extra: Partial<FormFieldConfig> & { subFields?: Record<string, Record<string, FormFieldConfig>> } = {}
): FormFieldConfig {
  const { subFields, ...rest } = extra;
  return {
    name,
    type: 'radio',
    required: true,
    isPageHeading: true,
    legendClasses: PAGE_LEGEND,
    translationKey: { label: 'question', hint: 'hint' },
    options: values.map((value): FormFieldOption => ({
      value,
      translationKey: `options.${value}`,
      ...(subFields?.[value] ? { subFields: subFields[value] } : {}),
    })),
    ...rest,
  };
}

export function yesNoQuestion(
  name: string,
  extra: Partial<FormFieldConfig> & { subFields?: Record<string, Record<string, FormFieldConfig>> } = {}
): FormFieldConfig {
  const { subFields, ...rest } = extra;
  return {
    ...radioQuestion(name, ['yes', 'no'], { subFields, ...rest }),
    options: ['yes', 'no'].map((value): FormFieldOption => ({
      value,
      translationKey: `makeAClaim:options.${value}`,
      ...(subFields?.[value] ? { subFields: subFields[value] } : {}),
    })),
  };
}

export function textField(name: string, extra: Partial<FormFieldConfig> = {}): FormFieldConfig {
  return {
    name,
    type: 'text',
    required: true,
    maxLength: FIELD_LIMITS.defaultText,
    translationKey: { label: `labels.${name}`, hint: `hints.${name}` },
    classes: 'govuk-!-width-two-thirds',
    labelClasses: 'govuk-label--s',
    ...extra,
  };
}

export function moneyField(name: string, extra: Partial<FormFieldConfig> = {}): FormFieldConfig {
  return {
    name,
    type: 'text',
    required: true,
    prefix: { text: '£' },
    classes: 'govuk-input--width-10',
    attributes: { inputmode: 'decimal', spellcheck: false },
    validator: amountValidator(`errors.${name.split('.').pop()}Invalid`),
    translationKey: { label: `labels.${name.split('.').pop()}`, hint: `hints.${name.split('.').pop()}` },
    labelClasses: 'govuk-label--s',
    ...extra,
  };
}

export function dateField(name: string, extra: Partial<FormFieldConfig> = {}): FormFieldConfig {
  return {
    name,
    type: 'date',
    required: true,
    noFutureDate: true,
    translationKey: { label: `labels.${name.split('.').pop()}`, hint: `hints.${name.split('.').pop()}` },
    legendClasses: 'govuk-fieldset__legend--s',
    ...extra,
  };
}

export function longTextField(name: string, extra: Partial<FormFieldConfig> = {}): FormFieldConfig {
  return {
    name,
    type: 'character-count',
    required: false,
    maxLength: FIELD_LIMITS.defaultLongText,
    translationKey: { label: `labels.${name.split('.').pop()}`, hint: `hints.${name.split('.').pop()}` },
    labelClasses: 'govuk-label--s',
    ...extra,
  };
}

/** A free text answer asked as the page's heading. */
export function pageHeadingLongText(name: string, extra: Partial<FormFieldConfig> = {}): FormFieldConfig {
  return longTextField(name, {
    translationKey: { label: 'question', hint: 'hint' },
    labelClasses: 'govuk-label--l',
    isPageHeading: true,
    ...extra,
  });
}
