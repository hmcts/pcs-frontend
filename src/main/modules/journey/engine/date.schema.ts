import { DateTime } from 'luxon';
import { superRefine, z } from 'zod/v4';

import { FieldConfig } from './schema';

export type DateFieldOptions = {
  required?: boolean;
  messages?: Partial<{
    required: string;
    missingParts: (missing: string[]) => string;
    invalidPart: (field: string) => string;
    notRealDate: string;
    mustBePast: string;
    mustBeTodayOrPast: string;
    mustBeFuture: string;
    mustBeTodayOrFuture: string;
    mustBeAfter: (date: DateTime, desc?: string) => string;
    mustBeSameOrAfter: (date: DateTime, desc?: string) => string;
    mustBeBefore: (date: DateTime, desc?: string) => string;
    mustBeSameOrBefore: (date: DateTime, desc?: string) => string;
    mustBeBetween: (start: DateTime, end: DateTime, desc?: string) => string;
  }>;
  mustBePast?: boolean;
  mustBeTodayOrPast?: boolean;
  mustBeFuture?: boolean;
  mustBeTodayOrFuture?: boolean;
  mustBeAfter?: { date: DateTime; description?: string };
  mustBeSameOrAfter?: { date: DateTime; description?: string };
  mustBeBefore?: { date: DateTime; description?: string };
  mustBeSameOrBefore?: { date: DateTime; description?: string };
  mustBeBetween?: { start: DateTime; end: DateTime; description?: string };
};

export const buildDateInputSchema = (fieldConfig: FieldConfig, options?: DateFieldOptions): z.ZodTypeAny => {
  return z
    .object({
      day: z.string().optional().default(''),
      month: z.string().optional().default(''),
      year: z.string().optional().default(''),
    })
    .check(
      superRefine((data, ctx) => {
        const fieldLabel =
          typeof fieldConfig.label === 'string'
            ? fieldConfig.label
            : fieldConfig.label?.text || fieldConfig.name || 'Date';

        const day = data.day?.trim() ?? '';
        const month = data.month?.trim() ?? '';
        const year = data.year?.trim() ?? '';
        const isEmpty = (s?: string) => !s || s.trim() === '';
        const isNumeric = (s: string) => /^\d+$/.test(s);

        const missing: string[] = [];
        if (isEmpty(day)) {
          missing.push('day');
        }
        if (isEmpty(month)) {
          missing.push('month');
        }
        if (isEmpty(year)) {
          missing.push('year');
        }

        const msgs = options?.messages ?? {};

        const anyProvided = !isEmpty(day) || !isEmpty(month) || !isEmpty(year);

        if (!anyProvided && options?.required) {
          ctx.addIssue({
            path: [fieldConfig.name || ''],
            message: msgs.required || `Enter ${fieldLabel.toLowerCase()}`,
            code: 'custom',
          });
          return;
        }

        if (!anyProvided && !options?.required) {
          return; // skip all further validation if not required and not provided
        }

        // Check for invalid parts (non-numeric or out of range)
        const invalidParts: string[] = [];
        const hasInvalidParts: boolean[] = [false, false, false]; // day, month, year

        // Check if parts are non-numeric
        if (!isEmpty(day) && !isNumeric(day)) {
          invalidParts.push('day');
          hasInvalidParts[0] = true;
        }
        if (!isEmpty(month) && !isNumeric(month)) {
          invalidParts.push('month');
          hasInvalidParts[1] = true;
        }
        if (!isEmpty(year) && !isNumeric(year)) {
          invalidParts.push('year');
          hasInvalidParts[2] = true;
        }

        // Range validation if numeric
        const dNum = Number(day);
        const mNum = Number(month);
        const yNum = Number(year);
        if (!isEmpty(day) && isNumeric(day) && (dNum < 1 || dNum > 31)) {
          invalidParts.push('day');
          hasInvalidParts[0] = true;
        }
        if (!isEmpty(month) && isNumeric(month) && (mNum < 1 || mNum > 12)) {
          invalidParts.push('month');
          hasInvalidParts[1] = true;
        }
        if (!isEmpty(year) && isNumeric(year) && (yNum < 1000 || yNum > 9999)) {
          invalidParts.push('year');
          hasInvalidParts[2] = true;
        }

        // If there are invalid parts, show individual part errors
        if (invalidParts.length > 0) {
          for (const field of ['day', 'month', 'year'] as const) {
            if (invalidParts.includes(field)) {
              ctx.addIssue({
                path: [field],
                message: msgs.invalidPart?.(field) || `Enter a valid ${field}`,
                code: 'custom',
              });
            }
          }
        }

        // Handle missing parts - always show individual part errors for missing parts
        if (missing.length > 0) {
          for (const field of ['day', 'month', 'year'] as const) {
            if (missing.includes(field)) {
              ctx.addIssue({
                path: [field],
                message: msgs.invalidPart?.(field) || `Enter a valid ${field}`,
                code: 'custom',
              });
            }
          }

          // break early and show invalid date message for whole field
          if (invalidParts.length > 0) {
            ctx.addIssue({
              path: [fieldConfig.name || ''],
              message: msgs.notRealDate || `${fieldLabel} must be a real date`,
              code: 'custom',
            });
            return;
          }

          // Also add a whole field error for field-level display
          ctx.addIssue({
            path: [fieldConfig.name || ''],
            message:
              msgs.missingParts?.(missing) ||
              (missing.length > 1
                ? `${fieldLabel} must include ${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}`
                : `${fieldLabel} must include a ${missing[0]}`),
            code: 'custom',
          });
        }

        // If we have any part errors (invalid or missing), return early
        if (invalidParts.length > 0 || missing.length > 0) {
          return;
        }

        const d = isNaN(Number(day)) ? 0 : Number(day);
        const m = isNaN(Number(month)) ? 0 : Number(month);
        const y = isNaN(Number(year)) ? 0 : Number(year);
        const date = DateTime.fromObject({ day: d, month: m, year: y });

        if (!date.isValid) {
          ctx.addIssue({
            path: [fieldConfig.name || ''],
            message: msgs.notRealDate || `${fieldLabel} must be a real date`,
            code: 'custom',
          });
          return;
        }

        if (options?.mustBePast && date >= DateTime.now().startOf('day')) {
          ctx.addIssue({
            path: [fieldConfig.name || ''],
            message: msgs.mustBePast || `${fieldLabel} must be in the past`,
            code: 'custom',
          });
        }

        if (options?.mustBeTodayOrPast && date > DateTime.now().startOf('day')) {
          ctx.addIssue({
            path: [fieldConfig.name || ''],
            message: msgs.mustBeTodayOrPast || `${fieldLabel} must be today or in the past`,
            code: 'custom',
          });
        }

        if (options?.mustBeFuture && date <= DateTime.now().startOf('day')) {
          ctx.addIssue({
            path: [fieldConfig.name || ''],
            message: msgs.mustBeFuture || `${fieldLabel} must be in the future`,
            code: 'custom',
          });
        }

        if (options?.mustBeTodayOrFuture && date < DateTime.now().startOf('day')) {
          ctx.addIssue({
            path: [fieldConfig.name || ''],
            message: msgs.mustBeTodayOrFuture || `${fieldLabel} must be today or in the future`,
            code: 'custom',
          });
        }

        if (options?.mustBeAfter && date <= options.mustBeAfter.date.startOf('day')) {
          ctx.addIssue({
            path: [fieldConfig.name || ''],
            message:
              msgs.mustBeAfter?.(options.mustBeAfter.date, options.mustBeAfter.description) ||
              `${fieldLabel} must be after ${options.mustBeAfter.date.toFormat('d MMMM yyyy')}${
                options.mustBeAfter.description ? ' ' + options.mustBeAfter.description : ''
              }`,
            code: 'custom',
          });
        }

        if (options?.mustBeSameOrAfter && date < options.mustBeSameOrAfter.date.startOf('day')) {
          ctx.addIssue({
            path: [fieldConfig.name || ''],
            message:
              msgs.mustBeSameOrAfter?.(options.mustBeSameOrAfter.date, options.mustBeSameOrAfter.description) ||
              `${fieldLabel} must be the same as or after ${options.mustBeSameOrAfter.date.toFormat('d MMMM yyyy')}${
                options.mustBeSameOrAfter.description ? ' ' + options.mustBeSameOrAfter.description : ''
              }`,
            code: 'custom',
          });
        }

        if (options?.mustBeBefore && date >= options.mustBeBefore.date.startOf('day')) {
          ctx.addIssue({
            path: [fieldConfig.name || ''],
            message:
              msgs.mustBeBefore?.(options.mustBeBefore.date, options.mustBeBefore.description) ||
              `${fieldLabel} must be before ${options.mustBeBefore.date.toFormat('d MMMM yyyy')}${
                options.mustBeBefore.description ? ' ' + options.mustBeBefore.description : ''
              }`,
            code: 'custom',
          });
        }

        if (options?.mustBeSameOrBefore && date > options.mustBeSameOrBefore.date.startOf('day')) {
          ctx.addIssue({
            path: [fieldConfig.name || ''],
            message:
              msgs.mustBeSameOrBefore?.(options.mustBeSameOrBefore.date, options.mustBeSameOrBefore.description) ||
              `${fieldLabel} must be the same as or before ${options.mustBeSameOrBefore.date.toFormat('d MMMM yyyy')}${
                options.mustBeSameOrBefore.description ? ' ' + options.mustBeSameOrBefore.description : ''
              }`,
            code: 'custom',
          });
        }

        if (options?.mustBeBetween) {
          const start = options.mustBeBetween.start.startOf('day');
          const end = options.mustBeBetween.end.startOf('day');
          if (date < start || date > end) {
            ctx.addIssue({
              path: [fieldConfig.name || ''],
              message:
                msgs.mustBeBetween?.(start, end, options.mustBeBetween.description) ||
                `${fieldLabel} must be between ${start.toFormat('d MMMM yyyy')} and ${end.toFormat('d MMMM yyyy')}${
                  options.mustBeBetween.description ? ' ' + options.mustBeBetween.description : ''
                }`,
              code: 'custom',
            });
          }
        }
      })
    );
};
