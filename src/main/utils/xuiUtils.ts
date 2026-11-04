import config from 'config';
import type { NextFunction, Response } from 'express';

import { CallbackRejectedError, HTTPError } from '../HttpError';

import { buildManageCaseDetailsRedirect } from '@utils/manageCaseRedirect';

export interface ValidationIssue {
  id: string;
  message: string;
}

export interface ErrorSummary {
  titleText: string;
  errorList: {
    text: string;
    href: string;
  }[];
}

export function mapXuiValidation(issues: ValidationIssue[]): Record<string, { text: string }> {
  return Object.fromEntries(issues.map(issue => [issue.id, { text: issue.message }]));
}

export function errorSummary(issues: ValidationIssue[]): ErrorSummary | undefined {
  return issues.length
    ? {
        titleText: 'There is a problem',
        errorList: issues.map(issue => ({ text: issue.message, href: `#${issue.id}` })),
      }
    : undefined;
}

/**
 * Answers an event that was refused. pcs-api refuses one with its reasons, which the page answers
 * if it can; otherwise the error handler logs them and shows a generic error. CCD decides who may use
 * an event from their role assignments: anyone else is not given the event's payload or allowed
 * to submit it, and is shown the page does not exist.
 */
export function refusedXUIEvent(
  res: Response,
  next: NextFunction,
  error: unknown,
  rejected: (error: CallbackRejectedError) => void = next
): void {
  if (error instanceof CallbackRejectedError) {
    return rejected(error);
  }
  if (error instanceof HTTPError && (error.status === 403 || error.status === 404)) {
    return void res.status(404).send('Not Found');
  }
  next(error);
}

export function manageCaseDetailsUrl(caseReference: string): string {
  const url = buildManageCaseDetailsRedirect(config.get('redirects.manageCaseReturnURL'), caseReference);
  if (!url) {
    throw new HTTPError('The Manage Case return URL is not configured', 500);
  }
  return url;
}
