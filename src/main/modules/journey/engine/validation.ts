import { Logger } from '@hmcts/nodejs-logging';

import { StepConfig, createFieldValidationSchema } from './schema';

export interface ValidationResult {
  success: boolean;
  data?: Record<string, unknown>;
  errors?: Record<string, { day?: string; month?: string; year?: string; message: string; anchor?: string }>;
}

export class JourneyValidator {
  private readonly logger: Logger = Logger.getLogger('JourneyValidator');

  validate(step: StepConfig, submission: Record<string, unknown>): ValidationResult {
    if (!step.fields) {
      return { success: true, data: submission };
    }

    const errors: Record<string, { day?: string; month?: string; year?: string; message: string; anchor?: string }> =
      {};
    const validatedData: Record<string, unknown> = {};

    // Iterate over every configured field on the step
    for (const [fieldName, fieldConfig] of Object.entries(step.fields)) {
      let fieldValue = submission[fieldName];

      // Normalise checkbox values – Express sends a single string when only one checkbox selected
      if (fieldConfig.type === 'checkboxes' && fieldValue) {
        fieldValue = Array.isArray(fieldValue) ? fieldValue : [fieldValue];
      }

      // Collect day/month/year for date fields so we can validate them as a unit
      if (fieldConfig.type === 'date') {
        fieldValue = {
          day: submission[`${fieldName}-day`],
          month: submission[`${fieldName}-month`],
          year: submission[`${fieldName}-year`],
        };
      }

      const fieldSchema = createFieldValidationSchema(fieldConfig);
      const result = fieldSchema.safeParse(fieldValue);

      if (result.success) {
        validatedData[fieldName] = result.data;
        continue;
      }

      // Build user-friendly error output for date components
      if (fieldConfig.type === 'date') {
        const perPart: Record<string, string | undefined> = {};
        for (const issue of result.error.issues) {
          const pathPart = (issue.path?.[0] ?? '') as string;
          if (['day', 'month', 'year'].includes(pathPart)) {
            perPart[pathPart] = issue.message;
          }
        }
        const firstIssue = result.error.issues[0];
        errors[fieldName] = {
          ...perPart,
          message: firstIssue?.message || 'Enter a valid date',
          anchor: `${fieldName}-${(firstIssue?.path?.[0] as string) ?? 'day'}`,
        };
        continue;
      }

      // Non-date fields: use first issue (with optional customMessage override)
      const firstIssue = result.error.issues[0];
      const fallbackMessage = firstIssue?.message || 'Invalid value';
      const custom = fieldConfig.validate?.customMessage;

      if (typeof custom === 'function') {
        try {
          errors[fieldName] = { message: custom(firstIssue?.code || 'unknown') };
        } catch (err) {
          this.logger.error('customMessage function error', err);
          errors[fieldName] = { message: fallbackMessage };
        }
      } else if (typeof custom === 'string') {
        errors[fieldName] = { message: custom };
      } else {
        errors[fieldName] = { message: fallbackMessage };
      }
    }

    return Object.keys(errors).length > 0 ? { success: false, errors } : { success: true, data: validatedData };
  }
}
