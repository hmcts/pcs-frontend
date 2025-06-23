import { StepConfig, createFieldValidationSchema } from './schema';

export interface ValidationResult {
  success: boolean;
  data?: Record<string, unknown>;
  errors?: Record<string, string | { day?: string; month?: string; year?: string; message: string }>;
}

export class JourneyValidator {
  validate(step: StepConfig, submission: Record<string, unknown>): ValidationResult {
    if (!step.fields) {
      return { success: true, data: submission };
    }

    const errors: Record<string, string | { day?: string; month?: string; year?: string; message: string }> = {};
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
        fieldValue = {
          day: submission[`${fieldName}-day`],
          month: submission[`${fieldName}-month`],
          year: submission[`${fieldName}-year`],
        };
        const dateVal = fieldValue as { day?: string; month?: string; year?: string };
        // GOV.UK error priority: required, incomplete, invalid, future
        if (!dateVal.day && !dateVal.month && !dateVal.year) {
          errors[fieldName] = {
            day: fieldConfig.validate?.errorMessages?.day,
            month: fieldConfig.validate?.errorMessages?.month,
            year: fieldConfig.validate?.errorMessages?.year,
            message: fieldConfig.validate?.errorMessages?.required || 'Please enter a valid date',
          };
          continue;
        } else if (!dateVal.day || !dateVal.month || !dateVal.year) {
          errors[fieldName] = {
            day: !dateVal.day ? fieldConfig.validate?.errorMessages?.day || 'Enter a valid day' : undefined,
            month: !dateVal.month ? fieldConfig.validate?.errorMessages?.month || 'Enter a valid month' : undefined,
            year: !dateVal.year ? fieldConfig.validate?.errorMessages?.year || 'Enter a valid year' : undefined,
            message: fieldConfig.validate?.errorMessages?.incomplete || 'Date must include a day, month and year',
          };
          continue;
        } else {
          const year = parseInt(dateVal.year, 10);
          const month = parseInt(dateVal.month, 10);
          const day = parseInt(dateVal.day, 10);
          const date = new Date(year, month - 1, day);
          if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
            errors[fieldName] = {
              day: fieldConfig.validate?.errorMessages?.day,
              month: fieldConfig.validate?.errorMessages?.month,
              year: fieldConfig.validate?.errorMessages?.year,
              message: fieldConfig.validate?.errorMessages?.invalid || 'Please enter a valid date',
            };
            continue;
          }
        }
      }

      // Handle address fields
      if (fieldConfig.type === 'address') {
        // Address can be either from lookup or manual entry
        const addressData = submission[fieldName];
        if (typeof addressData === 'object' && addressData !== null) {
          // This is a structured address (from lookup or manual entry)
          fieldValue = addressData;
        } else {
          // This might be a simple string or empty value
          fieldValue = addressData || {};
        }
      }

      const fieldSchema = createFieldValidationSchema(fieldConfig);
      const result = fieldSchema.safeParse(fieldValue);

      if (result.success) {
        validatedData[fieldName] = result.data;
      } else {
        // Get the first error message
        const errorMessage = result.error.issues[0]?.message || 'Invalid value';
        errors[fieldName] = fieldConfig.validate?.customMessage || errorMessage;
      }
    }

    return Object.keys(errors).length > 0 ? { success: false, errors } : { success: true, data: validatedData };
  }
}
