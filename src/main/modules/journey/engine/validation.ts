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

    // Validate each field using Zod
    for (const [fieldName, fieldConfig] of Object.entries(step.fields)) {
      let fieldValue = submission[fieldName];

      // Fix checkbox data - Express sends single checkbox as string, multiple as array
      if (fieldConfig.type === 'checkboxes' && fieldValue) {
        if (typeof fieldValue === 'string') {
          fieldValue = [fieldValue]; // Convert single string to array
        }
      }

      // Collect day/month/year for date fields
      if (fieldConfig.type === 'date') {
        // TODO: this is a hack to get the date validation working. We need to refactor this to be more robust.

        const fieldLevelErrors = fieldConfig.errorMessages ?? fieldConfig.validate?.errorMessages;
        fieldValue = {
          day: submission[`${fieldName}-day`],
          month: submission[`${fieldName}-month`],
          year: submission[`${fieldName}-year`],
        };
        const dateVal = fieldValue as { day?: string; month?: string; year?: string };

        // GOV.UK error priority: required, incomplete, invalid, future
        if (!dateVal.day && !dateVal.month && !dateVal.year) {
          errors[fieldName] = {
            day: fieldLevelErrors?.day,
            month: fieldLevelErrors?.month,
            year: fieldLevelErrors?.year,
            message: fieldLevelErrors?.required || 'Please enter a valid date',
            anchor: `${fieldName}-day`,
          };
          continue;
        } else if (!dateVal.day || !dateVal.month || !dateVal.year) {
          const firstMissing = !dateVal.day ? 'day' : !dateVal.month ? 'month' : 'year';
          errors[fieldName] = {
            day: !dateVal.day ? fieldLevelErrors?.day || 'Enter a valid day' : undefined,
            month: !dateVal.month ? fieldLevelErrors?.month || 'Enter a valid month' : undefined,
            year: !dateVal.year ? fieldLevelErrors?.year || 'Enter a valid year' : undefined,
            message: fieldLevelErrors?.incomplete || 'Date must include a day, month and year',
            anchor: `${fieldName}-${firstMissing}`,
          };
          continue;
        } else {
          const year = parseInt(dateVal.year, 10);
          const month = parseInt(dateVal.month, 10);
          const day = parseInt(dateVal.day, 10);

          // Collect any part-specific errors
          const partErrors: Record<string, string | undefined> = {};

          const numericPattern = /^[0-9]+$/;

          if (!numericPattern.test(String(dateVal.month)) || isNaN(month) || month < 1 || month > 12) {
            partErrors.month = fieldLevelErrors?.month || 'Enter a valid month';
          }

          if (!numericPattern.test(String(dateVal.day)) || isNaN(day) || day < 1 || day > 31) {
            partErrors.day = fieldLevelErrors?.day || 'Enter a valid day';
          }

          if (!numericPattern.test(String(dateVal.year)) || isNaN(year) || year < 1000) {
            partErrors.year = fieldLevelErrors?.year || 'Enter a valid year';
          }

          // If basic range checks passed, verify the composed date is valid
          if (Object.keys(partErrors).length === 0) {
            const date = new Date(year, month - 1, day);
            if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
              partErrors.day = fieldLevelErrors?.day || 'Enter a valid day';
            }
          }

          if (Object.keys(partErrors).length > 0) {
            const firstPart = partErrors.day ? 'day' : partErrors.month ? 'month' : partErrors.year ? 'year' : null;
            errors[fieldName] = {
              ...partErrors,
              // Use the first part-specific message as the summary line
              message:
                partErrors.day ??
                partErrors.month ??
                partErrors.year ??
                fieldLevelErrors?.invalid ??
                'Please enter a valid date',
              anchor: firstPart ? `${fieldName}-${firstPart}` : `${fieldName}-day`,
            };
            continue;
          }
        }
      }

      const fieldSchema = createFieldValidationSchema(fieldConfig);
      const result = fieldSchema.safeParse(fieldValue);

      if (result.success) {
        validatedData[fieldName] = result.data;
      } else {
        // Get the first error message produced by Zod (our schema already injects dynamic messages)
        const issue = result.error.issues[0];
        const fallbackMessage = issue?.message || 'Invalid value';

        const custom = fieldConfig.validate?.customMessage;
        if (typeof custom === 'function') {
          try {
            errors[fieldName] = { message: custom(issue?.code || 'unknown') };
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
    }

    return Object.keys(errors).length > 0 ? { success: false, errors } : { success: true, data: validatedData };
  }
}
