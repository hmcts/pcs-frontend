import { DateTime } from 'luxon';
import { superRefine, z } from 'zod/v4';

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

export const buildDateInputSchema = (fieldLabel: string, options?: DateFieldOptions): z.ZodTypeAny => {
  return z
    .object({
      day: z.string(),
      month: z.string(),
      year: z.string(),
    })
    .check(
      superRefine((data, ctx) => {
        const { day, month, year } = data;
        const isEmpty = (s: string) => s.trim() === '';
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
            path: [],
            message: msgs.required || `Enter ${fieldLabel.toLowerCase()}`,
            code: 'custom',
          });
          return;
        }

        if (!anyProvided && !options?.required) {
          return; // skip all further validation if not required and not provided
        }

              let issueCount = 0;
      if (missing.length > 0) {
        for (const m of missing) {
          ctx.addIssue({
            path: [m],
            message: msgs.missingParts?.(missing) || `${fieldLabel} must include a ${m}`,
            code: 'custom',
          });
          issueCount += 1;
        }
      }

        const invalidFields: (keyof typeof data)[] = [];
        if (!isNumeric(day)) {
          invalidFields.push('day');
        }
        if (!isNumeric(month)) {
          invalidFields.push('month');
        }
        if (!isNumeric(year)) {
          invalidFields.push('year');
        }

              if (invalidFields.length > 0) {
        for (const field of invalidFields) {
          ctx.addIssue({
            path: [field],
            message: msgs.invalidPart?.(field) || `${fieldLabel} must include a valid ${field}`,
            code: 'custom',
          });
          issueCount += 1;
        }
      }

      // If we already recorded any missing or invalid part issues, skip further validation.
      if (issueCount > 0) {
        return;
      }

        const d = Number(day);
        const m = Number(month);
        const y = Number(year);
        const date = DateTime.fromObject({ day: d, month: m, year: y });

        if (!date.isValid) {
          ctx.addIssue({
            path: [],
            message: msgs.notRealDate || `${fieldLabel} must be a real date`,
            code: 'custom',
          });
          return;
        }

        if (options?.mustBePast && date >= DateTime.now().startOf('day')) {
          ctx.addIssue({
            path: [],
            message: msgs.mustBePast || `${fieldLabel} must be in the past`,
            code: 'custom',
          });
        }

        if (options?.mustBeTodayOrPast && date > DateTime.now().startOf('day')) {
          ctx.addIssue({
            path: [],
            message: msgs.mustBeTodayOrPast || `${fieldLabel} must be today or in the past`,
            code: 'custom',
          });
        }

        if (options?.mustBeFuture && date <= DateTime.now().startOf('day')) {
          ctx.addIssue({
            path: [],
            message: msgs.mustBeFuture || `${fieldLabel} must be in the future`,
            code: 'custom',
          });
        }

        if (options?.mustBeTodayOrFuture && date < DateTime.now().startOf('day')) {
          ctx.addIssue({
            path: [],
            message: msgs.mustBeTodayOrFuture || `${fieldLabel} must be today or in the future`,
            code: 'custom',
          });
        }

        if (options?.mustBeAfter && date <= options.mustBeAfter.date.startOf('day')) {
          ctx.addIssue({
            path: [],
            message:
              msgs.mustBeAfter?.(options.mustBeAfter.date, options.mustBeAfter.description) ||
              `${fieldLabel} must be after ${options.mustBeAfter.date.toFormat('d MMMM yyyy')}${options.mustBeAfter.description ? ' ' + options.mustBeAfter.description : ''}`,
            code: 'custom',
          });
        }

        if (options?.mustBeSameOrAfter && date < options.mustBeSameOrAfter.date.startOf('day')) {
          ctx.addIssue({
            path: [],
            message:
              msgs.mustBeSameOrAfter?.(options.mustBeSameOrAfter.date, options.mustBeSameOrAfter.description) ||
              `${fieldLabel} must be the same as or after ${options.mustBeSameOrAfter.date.toFormat('d MMMM yyyy')}${options.mustBeSameOrAfter.description ? ' ' + options.mustBeSameOrAfter.description : ''}`,
            code: 'custom',
          });
        }

        if (options?.mustBeBefore && date >= options.mustBeBefore.date.startOf('day')) {
          ctx.addIssue({
            path: [],
            message:
              msgs.mustBeBefore?.(options.mustBeBefore.date, options.mustBeBefore.description) ||
              `${fieldLabel} must be before ${options.mustBeBefore.date.toFormat('d MMMM yyyy')}${options.mustBeBefore.description ? ' ' + options.mustBeBefore.description : ''}`,
            code: 'custom',
          });
        }

        if (options?.mustBeSameOrBefore && date > options.mustBeSameOrBefore.date.startOf('day')) {
          ctx.addIssue({
            path: [],
            message:
              msgs.mustBeSameOrBefore?.(options.mustBeSameOrBefore.date, options.mustBeSameOrBefore.description) ||
              `${fieldLabel} must be the same as or before ${options.mustBeSameOrBefore.date.toFormat('d MMMM yyyy')}${options.mustBeSameOrBefore.description ? ' ' + options.mustBeSameOrBefore.description : ''}`,
            code: 'custom',
          });
        }

        if (options?.mustBeBetween) {
          const start = options.mustBeBetween.start.startOf('day');
          const end = options.mustBeBetween.end.startOf('day');
          if (date < start || date > end) {
            ctx.addIssue({
              path: [],
              message:
                msgs.mustBeBetween?.(start, end, options.mustBeBetween.description) ||
                `${fieldLabel} must be between ${start.toFormat('d MMMM yyyy')} and ${end.toFormat('d MMMM yyyy')}${options.mustBeBetween.description ? ' ' + options.mustBeBetween.description : ''}`,
              code: 'custom',
            });
          }
        }
      })
    );
};
