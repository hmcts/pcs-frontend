import type { TFunction } from 'i18next';
import { DateTime } from 'luxon';

import { formatDateViaI18n } from './dateUtils';
import { FieldConfig, JourneyConfig, StepConfig } from './schema';
import { SummaryRow } from './types';

export class SummaryBuilder {
  static buildSummaryRows(
    journey: JourneyConfig,
    basePath: string,
    allData: Record<string, unknown>,
    t: TFunction,
    currentLang?: string
  ): SummaryRow[] {
    const rows: SummaryRow[] = [];

    for (const [stepId, stepConfig] of Object.entries(journey.steps)) {
      const typedStepConfig = stepConfig as StepConfig;
      if (typedStepConfig.type === 'summary' || typedStepConfig.type === 'confirmation') {
        continue;
      }
      if (!typedStepConfig.fields || Object.keys(typedStepConfig.fields).length === 0) {
        continue;
      }
      const stepData = allData[stepId] as Record<string, unknown>;
      if (!stepData || Object.keys(stepData).length === 0) {
        continue;
      }

      const changeHref = currentLang
        ? `${basePath}/${encodeURIComponent(stepId)}?lang=${encodeURIComponent(currentLang)}`
        : `${basePath}/${encodeURIComponent(stepId)}`;

      for (const [fieldName, fieldConfig] of Object.entries(typedStepConfig.fields)) {
        const typedFieldConfig = fieldConfig as FieldConfig;
        if (typedFieldConfig.type === 'button') {
          continue;
        }
        const rawValue = stepData[fieldName];
        if (rawValue === undefined || rawValue === null || rawValue === '') {
          continue;
        }

        // Determine field label (translated)
        let fieldLabel: string = fieldName;

        // Check if fieldset legend should be used (when isPageHeading is true)
        if (
          typedFieldConfig.fieldset?.legend &&
          typeof typedFieldConfig.fieldset.legend === 'object' &&
          typedFieldConfig.fieldset.legend.isPageHeading &&
          typedFieldConfig.fieldset.legend.text
        ) {
          fieldLabel = t(typedFieldConfig.fieldset.legend.text, typedFieldConfig.fieldset.legend.text);
        } else if (typeof typedFieldConfig.label === 'string') {
          fieldLabel = t(typedFieldConfig.label, typedFieldConfig.label);
        } else if (typedFieldConfig.label && typeof typedFieldConfig.label === 'object') {
          const lbl = typedFieldConfig.label as Record<string, unknown>;
          const text = (lbl.text as string) || (lbl['html'] as string) || fieldName;
          fieldLabel = t(text, text);
        } else {
          // Fall back to step title if no field label is provided
          if (typeof typedStepConfig.title === 'string') {
            fieldLabel = t(typedStepConfig.title, typedStepConfig.title);
          }
        }

        // Format value based on type
        let valueText = '' as string | null;
        let valueHtml = '' as string | null;
        const value = rawValue as unknown;

        if (
          typedFieldConfig.type === 'date' &&
          value &&
          typeof value === 'object' &&
          'day' in (value as Record<string, unknown>) &&
          'month' in (value as Record<string, unknown>) &&
          'year' in (value as Record<string, unknown>)
        ) {
          const v = value as Record<string, string>;
          const dTrim = v.day?.trim() ?? '';
          const mTrim = v.month?.trim() ?? '';
          const yTrim = v.year?.trim() ?? '';
          if (dTrim || mTrim || yTrim) {
            const dt = DateTime.fromObject({ day: Number(dTrim), month: Number(mTrim), year: Number(yTrim) });
            valueText = dt.isValid ? formatDateViaI18n(dt, t) : `${dTrim}/${mTrim}/${yTrim}`;
          }
        } else if (
          typedFieldConfig.type === 'checkboxes' ||
          typedFieldConfig.type === 'radios' ||
          typedFieldConfig.type === 'select'
        ) {
          const items = typedFieldConfig.items;
          const selected = items
            ?.filter(option => {
              const optionValue = typeof option === 'string' ? option : (option.value as string);
              if (typedFieldConfig.type === 'checkboxes') {
                return Array.isArray(value) && (value as string[]).includes(optionValue);
              }
              return value === optionValue;
            })
            .map(option => {
              if (typeof option === 'string') {
                return t(option, option);
              } else {
                return typeof option.text === 'string'
                  ? t(option.text, option.text)
                  : (option.text as unknown as string);
              }
            })
            .join(', ');
          valueText = selected ?? '';
        } else if (typedFieldConfig.type === 'address' && value && typeof value === 'object') {
          const addr = value as Record<string, string | undefined>;
          const parts = [addr.addressLine1, addr.addressLine2, addr.town, addr.county, addr.postcode]
            .map(v => (typeof v === 'string' ? v.trim() : ''))
            .filter(v => v.length > 0);
          valueHtml = parts.join('<br>');
        } else {
          valueText = Array.isArray(value) ? (value as string[]).join(', ') : String(value);
        }

        const row: SummaryRow = {
          key: { text: fieldLabel },
          value: valueHtml ? { html: valueHtml, text: '' } : { text: valueText || '' },
          actions: {
            items: [{ href: changeHref, text: t('change', 'Change'), visuallyHiddenText: fieldLabel.toLowerCase() }],
          },
        };
        rows.push(row);
      }
    }

    return rows;
  }

  static buildSummaryCards(
    journey: JourneyConfig,
    basePath: string,
    allData: Record<string, unknown>,
    t: TFunction,
    currentLang?: string
  ): { card: { title: { text: string } }; rows: SummaryRow[] }[] {
    const cards: { card: { title: { text: string } }; rows: SummaryRow[] }[] = [];

    for (const [stepId, stepConfig] of Object.entries(journey.steps)) {
      const typedStepConfig = stepConfig as StepConfig;
      if (typedStepConfig.type === 'summary' || typedStepConfig.type === 'confirmation') {
        continue;
      }
      if (!typedStepConfig.fields || Object.keys(typedStepConfig.fields).length === 0) {
        continue;
      }
      const stepData = allData[stepId] as Record<string, unknown>;
      if (!stepData || Object.keys(stepData).length === 0) {
        continue;
      }

      // Card title from step.title (translated)
      let cardTitle = stepId;
      if (typeof typedStepConfig.title === 'string') {
        cardTitle = t(typedStepConfig.title, typedStepConfig.title);
      } else if (typedStepConfig.title) {
        // Fallback for non-string titles
        cardTitle = String(typedStepConfig.title);
      }

      // Reuse row building by calling the existing method but filter by this step only
      const changeHref = currentLang
        ? `${basePath}/${encodeURIComponent(stepId)}?lang=${encodeURIComponent(currentLang)}`
        : `${basePath}/${encodeURIComponent(stepId)}`;

      const rows: SummaryRow[] = [];
      for (const [fieldName, fieldConfig] of Object.entries(typedStepConfig.fields)) {
        const typedFieldConfig = fieldConfig as FieldConfig;
        if (typedFieldConfig.type === 'button') {
          continue;
        }
        const rawValue = stepData[fieldName];
        if (rawValue === undefined || rawValue === null || rawValue === '') {
          continue;
        }

        // Build field label
        let fieldLabel: string = fieldName;
        if (typeof typedFieldConfig.label === 'string') {
          fieldLabel = t(typedFieldConfig.label, typedFieldConfig.label);
        } else if (typedFieldConfig.label && typeof typedFieldConfig.label === 'object') {
          const lbl = typedFieldConfig.label as Record<string, unknown>;
          const text = (lbl.text as string) || (lbl['html'] as string) || fieldName;
          fieldLabel = t(text, text);
        } else if (typedFieldConfig.fieldset && typedFieldConfig.fieldset.legend) {
          const legend = typedFieldConfig.fieldset.legend as Record<string, unknown>;
          const text = (legend.text as string) || (legend['html'] as string) || fieldName;
          fieldLabel = t(text, text);
        }

        // Value formatting (copied from buildSummaryRows)
        let valueText: string | null = '';
        let valueHtml: string | null = null;
        const value = rawValue as unknown;
        if (
          typedFieldConfig.type === 'date' &&
          value &&
          typeof value === 'object' &&
          'day' in (value as Record<string, unknown>) &&
          'month' in (value as Record<string, unknown>) &&
          'year' in (value as Record<string, unknown>)
        ) {
          const v = value as Record<string, string>;
          const dTrim = v.day?.trim() ?? '';
          const mTrim = v.month?.trim() ?? '';
          const yTrim = v.year?.trim() ?? '';
          if (dTrim || mTrim || yTrim) {
            const dt = DateTime.fromObject({ day: Number(dTrim), month: Number(mTrim), year: Number(yTrim) });
            valueText = dt.isValid ? formatDateViaI18n(dt, t) : `${dTrim}/${mTrim}/${yTrim}`;
          }
        } else if (
          typedFieldConfig.type === 'checkboxes' ||
          typedFieldConfig.type === 'radios' ||
          typedFieldConfig.type === 'select'
        ) {
          const items = typedFieldConfig.items;
          const selected = items
            ?.filter(option => {
              const optionValue = typeof option === 'string' ? option : (option.value as string);
              if (typedFieldConfig.type === 'checkboxes') {
                return Array.isArray(value) && (value as string[]).includes(optionValue);
              }
              return value === optionValue;
            })
            .map(option => {
              if (typeof option === 'string') {
                return t(option, option);
              } else {
                return typeof option.text === 'string'
                  ? t(option.text, option.text)
                  : (option.text as unknown as string);
              }
            })
            .join(', ');
          valueText = selected ?? '';
        } else if (typedFieldConfig.type === 'address' && value && typeof value === 'object') {
          const addr = value as Record<string, string | undefined>;
          const parts = [addr.addressLine1, addr.addressLine2, addr.town, addr.county, addr.postcode]
            .map(v => (typeof v === 'string' ? v.trim() : ''))
            .filter(v => v.length > 0);
          valueHtml = parts.join('<br>');
        } else {
          valueText = Array.isArray(value) ? (value as string[]).join(', ') : String(value);
        }

        rows.push({
          key: { text: fieldLabel },
          value: valueHtml ? { html: valueHtml, text: '' } : { text: valueText || '' },
          actions: { items: [{ href: changeHref, text: t('change', 'Change'), visuallyHiddenText: fieldLabel }] },
        });
      }

      if (rows.length > 0) {
        cards.push({ card: { title: { text: cardTitle } }, rows });
      }
    }

    return cards;
  }
}
