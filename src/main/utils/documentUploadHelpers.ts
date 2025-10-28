import { Logger } from '@hmcts/nodejs-logging';
import { Request, Response } from 'express';

import type { CaseDocument } from '../../types/global';

const logger = Logger.getLogger('documentUploadHelpers');

/**
 * Validates that the user session contains required authentication data
 * @returns User object if valid, null otherwise
 */
export function validateUserAuth(req: Request, res: Response): { accessToken: string; uid?: string } | null {
  const user = req.session.user;
  if (!user || !user.accessToken) {
    logger.error('User session missing required auth data');
    res.status(401).render('error', { message: 'Authentication required' });
    return null;
  }
  return user as { accessToken: string; uid?: string };
}

/**
 * Gets uploaded documents from session
 */
export function getUploadedDocuments(req: Request): CaseDocument[] {
  return req.session.uploadedDocuments || [];
}

/**
 * Saves session and redirects to specified path
 */
export function saveSessionAndRedirect(
  req: Request,
  res: Response,
  redirectPath: string,
  errorMessage = 'Failed to save session'
): void {
  req.session.save(err => {
    if (err) {
      logger.error('Session save error:', err);
      return res.status(500).render('error', { message: errorMessage });
    }
    res.redirect(redirectPath);
  });
}

/**
 * Handles route errors with consistent logging and error rendering
 */
export function handleRouteError(
  error: unknown,
  res: Response,
  context: string,
  renderTemplate = 'error',
  additionalData: Record<string, unknown> = {}
): void {
  const errorMessage = error instanceof Error ? error.message : `Failed to ${context}`;
  logger.error(`${context} error:`, error);

  // For 'error' template, use 'message'. For other templates, use 'error'
  const errorData = renderTemplate === 'error' ? { message: errorMessage } : { error: errorMessage };

  res.status(500).render(renderTemplate, {
    ...errorData,
    ...additionalData,
  });
}
