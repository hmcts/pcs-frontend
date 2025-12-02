import type { TFunction } from 'i18next';

import { processErrorsForTemplate } from './errorUtils';
import { Navigation } from './navigation';
import { FieldConfig, JourneyConfig, StepConfig } from './schema';
import { SummaryBuilder } from './summaryBuilder';
import { JourneyContext } from './types';

export class ContextBuilder {
  static buildJourneyContext(
    step: StepConfig,
    caseId: string,
    journey: JourneyConfig,
    basePath: string,
    allData: Record<string, unknown>,
    t: TFunction,
    lang: string = 'en',
    errors?: Record<string, { day?: string; month?: string; year?: string; message: string; anchor?: string }>
  ): JourneyContext & {
    dateItems?: Record<string, { name: string; classes: string; value: string; attributes?: Record<string, string> }[]>;
  } {
    const previousStepUrl = Navigation.findPreviousStep(step.id, journey, allData);
    const summaryRows =
      step.type === 'summary' ? SummaryBuilder.buildSummaryRows(journey, basePath, allData, t, lang) : undefined;
    const summaryCards =
      step.type === 'summary' ? SummaryBuilder.buildSummaryCards(journey, basePath, allData, t, lang) : undefined;
    const data = (allData[step.id] as Record<string, unknown>) || {};

    // Build dateItems for all date fields
    const dateItems: Record<
      string,
      { name: string; classes: string; value: string; attributes?: Record<string, string> }[]
    > = {};
    if (step.fields) {
      for (const [fieldName, fieldConfig] of Object.entries(step.fields)) {
        const typedFieldConfig = fieldConfig as FieldConfig;
        if (typedFieldConfig.type === 'date') {
          const fieldValue = data[fieldName] as Record<'day' | 'month' | 'year', string | undefined>;
          const fieldError = errors && errors[fieldName];
          const hasPartSpecificErrors = !!(
            fieldError &&
            typeof fieldError === 'object' &&
            (fieldError.day || fieldError.month || fieldError.year)
          );

          dateItems[fieldName] = (['day', 'month', 'year'] as ('day' | 'month' | 'year')[]).map(part => {
            const partHasError = !!(
              fieldError &&
              typeof fieldError === 'object' &&
              (hasPartSpecificErrors ? fieldError[part] : true)
            );
            return {
              name: part,
              label: t(`date.${part}`),
              classes:
                (part === 'day'
                  ? 'govuk-input--width-2'
                  : part === 'month'
                    ? 'govuk-input--width-2'
                    : 'govuk-input--width-4') + (partHasError ? ' govuk-input--error' : ''),
              value: fieldValue?.[part] || '',
              attributes: {
                maxlength: part === 'year' ? '4' : '2',
                inputmode: 'numeric',
              },
            };
          });
        }
      }
    }

    // ── Make a translated copy of the step (do NOT mutate cached journey) ──
    const processedFields: Record<string, FieldConfig> = {};
    let stepCopy: StepConfig = { ...step };

    // Translate step-level title/description if they are keys
    if (typeof stepCopy.title === 'string') {
      stepCopy.title = t(stepCopy.title, stepCopy.title);
    }
    if (typeof stepCopy.description === 'string') {
      stepCopy.description = t(stepCopy.description, stepCopy.description);
    }

    if (step.fields) {
      for (const [fieldName, fieldConfig] of Object.entries(step.fields)) {
        const typedFieldConfig = fieldConfig as FieldConfig;

        // Clone to avoid mutating cached journey config
        const processed: FieldConfig = { ...typedFieldConfig } as FieldConfig;

        // Ensure id / name
        if (!processed.id) {
          processed.id = fieldName;
        }
        if (!processed.name) {
          processed.name = fieldName;
        }

        const fieldValue = data[fieldName] as unknown;
        const fieldError = errors && errors[fieldName];

        // Standardised errorMessage for macros (translate the message key)
        if (fieldError) {
          processed.errorMessage = { text: t(fieldError.message, fieldError.message) };
        }

        // Translate label
        if (typedFieldConfig.label && typeof typedFieldConfig.label === 'object') {
          const newLabel = { ...(typedFieldConfig.label as Record<string, unknown>) };
          if (typeof newLabel.text === 'string') {
            newLabel.text = t(newLabel.text, newLabel.text);
          }
          if (typeof newLabel.html === 'string') {
            newLabel.html = t(newLabel.html, newLabel.html);
          }
          processed.label = newLabel;
        } else if (typeof typedFieldConfig.label === 'string') {
          processed.label = { text: t(typedFieldConfig.label, typedFieldConfig.label) };
        }

        // Translate hint
        if (typedFieldConfig.hint && typeof typedFieldConfig.hint === 'object') {
          const newHint = { ...(typedFieldConfig.hint as Record<string, unknown>) };
          if (typeof newHint.text === 'string') {
            newHint.text = t(newHint.text, newHint.text);
          }
          if (typeof newHint.html === 'string') {
            newHint.html = t(newHint.html, newHint.html);
          }
          processed.hint = newHint;
        } else if (typeof typedFieldConfig.hint === 'string') {
          processed.hint = { text: t(typedFieldConfig.hint, typedFieldConfig.hint) };
        }

        // Translate fieldset.legend.{text|html}
        if (typedFieldConfig.fieldset?.legend) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const legend = typedFieldConfig.fieldset.legend as any;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newLegend: any = { ...legend };
          if (typeof newLegend.text === 'string') {
            newLegend.text = t(newLegend.text, newLegend.text);
          }
          if (typeof newLegend.html === 'string') {
            newLegend.html = t(newLegend.html, newLegend.html);
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          processed.fieldset = { ...(typedFieldConfig.fieldset as any), legend: newLegend };
        }

        // Values & options
        switch (typedFieldConfig.type) {
          case 'text':
          case 'email':
          case 'tel':
          case 'url':
          case 'password':
          case 'number':
          case 'textarea': {
            // @ts-expect-error value is not typed in FieldConfig
            processed.value = fieldValue ?? '';
            break;
          }

          case 'radios':
          case 'checkboxes':
          case 'select': {
            const baseOptions = (typedFieldConfig.items ?? []) as (string | Record<string, unknown>)[];

            const items = baseOptions.map(option => {
              if (typeof option === 'string') {
                // Translate the displayed text; value stays as the raw string key
                const obj = { value: option, text: t(option, option) } as Record<string, unknown>;
                if (typedFieldConfig.type === 'checkboxes') {
                  obj['checked'] = Array.isArray(fieldValue) && (fieldValue as string[]).includes(option);
                } else if (typedFieldConfig.type === 'select') {
                  obj['selected'] = fieldValue === option;
                } else {
                  obj['checked'] = fieldValue === option;
                }
                return obj;
              } else {
                const obj = { ...option } as Record<string, unknown>;
                const optVal = (option as Record<string, unknown>).value as string;

                if (typeof obj.text === 'string') {
                  obj.text = t(obj.text, obj.text as string);
                }
                if (typeof obj.html === 'string') {
                  obj.html = t(obj.html, obj.html as string);
                }

                if (typedFieldConfig.type === 'checkboxes') {
                  obj['checked'] = Array.isArray(fieldValue) && (fieldValue as string[]).includes(optVal);
                } else if (typedFieldConfig.type === 'select') {
                  obj['selected'] = fieldValue === optVal;
                } else {
                  obj['checked'] = fieldValue === optVal;
                }
                return obj;
              }
            });

            // For selects add default prompt if author didn't supply one
            if (typedFieldConfig.type === 'select' && !(typedFieldConfig.items && typedFieldConfig.items.length)) {
              items.unshift({ value: '', text: t('form.chooseOption', 'Choose an option') });
            }

            // @ts-expect-error value is not typed
            processed.items = items;
            break;
          }

          case 'date': {
            processed.items = dateItems[fieldName] ?? [];
            processed.namePrefix = fieldName;
            break;
          }

          case 'address': {
            // Pass through any stored value so template can prefill inputs
            // @ts-expect-error address composite value
            processed.value = fieldValue ?? {
              addressLine1: '',
              addressLine2: '',
              town: '',
              county: '',
              postcode: '',
            };
            processed.namePrefix = fieldName;
            break;
          }

          case 'button': {
            // Translate button label or default
            if (!processed.text) {
              processed.text = t('buttons.continue', 'Continue');
            } else if (typeof processed.text === 'string') {
              processed.text = t(processed.text, processed.text);
            }
            const existingAttrs = processed.attributes ?? {};
            processed.attributes = { type: 'submit', ...existingAttrs };
            break;
          }
        }

        processedFields[fieldName] = processed;
      }

      // Create a new step object with processed fields to avoid mutating original
      stepCopy = { ...stepCopy, fields: processedFields } as StepConfig;
    }

    return {
      caseId,
      step: stepCopy,
      data,
      allData,
      errors,
      errorSummary: processErrorsForTemplate(errors, stepCopy, (key: unknown) =>
        typeof key === 'string' ? t(key, key) : String(key ?? '')
      ),
      previousStepUrl: previousStepUrl || null,
      summaryRows,
      summaryCards,
      dateItems,
    };
  }
}
