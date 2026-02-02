import { Injectable } from '@nestjs/common';
import type { ZodError } from 'zod';

export interface FormError {
  field: string;
  text: string;
}

export interface ErrorSummary {
  titleText: string;
  errorList: { text: string; href: string }[];
}

export interface ValidationErrors {
  errors: Record<string, { text: string }>;
  errorSummary: ErrorSummary;
}

@Injectable()
export class ValidationService {
  formatZodErrors(zodError: ZodError): ValidationErrors {
    const fieldErrors = zodError.flatten().fieldErrors;

    const errors: Record<string, { text: string }> = {};
    const errorList: { text: string; href: string }[] = [];

    for (const [field, messages] of Object.entries(fieldErrors)) {
      const errorText = messages?.[0] || 'Validation error';
      errors[field] = { text: errorText };
      errorList.push({
        text: errorText,
        href: `#${field}`,
      });
    }

    return {
      errors,
      errorSummary: {
        titleText: 'There is a problem',
        errorList,
      },
    };
  }

  getFirstError(zodError: ZodError): FormError {
    const fieldErrors = zodError.flatten().fieldErrors;
    const firstField = Object.keys(fieldErrors)[0];
    const messages = fieldErrors[firstField as keyof typeof fieldErrors];

    return {
      field: firstField,
      text: Array.isArray(messages) ? messages[0] : 'Validation error',
    };
  }
}
