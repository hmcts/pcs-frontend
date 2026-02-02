import { Injectable } from '@nestjs/common';
import type { ZodError } from 'zod';

export interface FormattedError {
  text: string;
  href: string;
}

export interface FormattedErrors {
  errors: Record<string, { text: string }>;
  errorSummary: { errorList: FormattedError[] };
}

@Injectable()
export class RespondToClaimValidationService {
  formatZodErrors(zodError: ZodError): FormattedErrors {
    const errors: Record<string, { text: string }> = {};
    const errorList: FormattedError[] = [];

    for (const issue of zodError.issues) {
      const fieldName = issue.path.join('.');
      const errorMessage = issue.message;

      errors[fieldName] = { text: errorMessage };
      errorList.push({
        text: errorMessage,
        href: `#${fieldName}`,
      });
    }

    return {
      errors,
      errorSummary: { errorList },
    };
  }
}
