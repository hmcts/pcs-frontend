import type { Request, Response } from 'express';

import type { StepFormData } from '../../interfaces/stepFormData.interface';

import type { ValidationErrors } from './formHelpers';

interface ErrorSummaryItem {
  text: string;
  href: string;
}

export interface ErrorSummary {
  titleText: string;
  errorList: ErrorSummaryItem[];
}

const hasErrors = (errors: ValidationErrors): boolean => Object.keys(errors).length > 0;

export const buildErrorSummary = (
  errors: ValidationErrors,
  title?: string,
  fallbackTitle = 'There is a problem'
): ErrorSummary | null => {
  if (!hasErrors(errors)) {
    return null;
  }

  const errorList: ErrorSummaryItem[] = Object.values(errors).map(error => ({
    text: error.text,
    href: `#${error.anchor ?? error.field}`,
  }));

  return {
    titleText: title || fallbackTitle,
    errorList,
  };
};

export const renderWithErrors = (
  req: Request,
  res: Response,
  view: string,
  errors: ValidationErrors,
  content: StepFormData
): Response => {
  const summaryTitle = typeof content.errorSummaryTitle === 'string' ? content.errorSummaryTitle : undefined;
  const summary = buildErrorSummary(errors, summaryTitle);
  const [firstError] = Object.values(errors);
  const fieldErrors = Object.entries(errors).reduce<Record<string, string>>((acc, [fieldName, error]) => {
    acc[fieldName] = error.text;
    return acc;
  }, {});

  res.status(400);
  res.render(view, {
    ...content,
    ...(req.body || {}),
    errors,
    fieldErrors,
    error: firstError,
    errorSummary: summary,
    errorSummaryTitle: summary?.titleText ?? summaryTitle,
  });

  return res;
};
