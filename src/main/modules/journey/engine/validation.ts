import { Logger } from '@hmcts/nodejs-logging';

import { StepConfig, createFieldValidationSchema } from './schema';

export interface ValidationResult {
  success: boolean;
  data?: Record<string, unknown>;
  errors?: Record<
    string,
    { day?: string; month?: string; year?: string; message: string; anchor?: string; _fieldOnly?: boolean }
  >;
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

      fieldConfig.name = fieldName;

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

      if (fieldConfig.type === 'date') {
        // Separate part-specific errors from whole field errors
        const partErrors: string[] = [];
        let wholeFieldError: string | null = null;
        const partErrorMessages: { day?: string; month?: string; year?: string } = {};

        for (const issue of result.error.issues) {
          const anchorPart = (issue.path?.[0] as string) ?? 'day';

          if (['day', 'month', 'year'].includes(anchorPart)) {
            // This is a part-specific error
            partErrors.push(anchorPart);
            const anchorId = `${fieldName}-${anchorPart}`;

            // Store part-specific error message for engine to use for styling
            partErrorMessages[anchorPart as keyof typeof partErrorMessages] = issue.message || 'Enter a valid date';

            // Also store as separate entry for summary processing
            if (!errors[anchorId]) {
              errors[anchorId] = {
                message: issue.message || 'Enter a valid date',
                anchor: anchorId,
              };
            }
          } else {
            // This is a whole field error (e.g., missing parts, invalid date)
            wholeFieldError = issue.message || 'Enter a valid date';
          }
        }

        // If there are part-specific errors, don't add whole field error to summary
        // But still add it for field-level display
        if (wholeFieldError && partErrors.length === 0) {
          // Only whole field error, add to summary
          errors[fieldName] = {
            message: wholeFieldError,
            anchor: `${fieldName}-day`,
          };
        } else if (partErrors.length > 0) {
          // There are part-specific errors, add a generic field error for field-level display
          // but mark it as field-only so it doesn't appear in summary
          // Include part-specific error messages for engine styling
          const fieldError: {
            day?: string;
            month?: string;
            year?: string;
            message: string;
            anchor?: string;
            _fieldOnly?: boolean;
          } = {
            message: wholeFieldError || 'Enter a valid date',
            anchor: `${fieldName}-day`,
            _fieldOnly: true,
          };

          if (partErrorMessages.day) {
            fieldError.day = partErrorMessages.day;
          }
          if (partErrorMessages.month) {
            fieldError.month = partErrorMessages.month;
          }
          if (partErrorMessages.year) {
            fieldError.year = partErrorMessages.year;
          }

          errors[fieldName] = fieldError;
        }

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
