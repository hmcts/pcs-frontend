import type { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware/oidc';

import { Logger } from '@modules/logger';
import { type AccessCodeValidationError, validateAccessCode } from '@services/pcsApi/pcsApiService';
import { safeRedirect303 } from '@utils/safeRedirect';

const logger = Logger.getLogger('citizenCaseLink');

const CLAIM_NUMBER_REGEX = /^[\d-]+$/;
const ACCESS_CODE_REGEX = /^[a-zA-Z0-9]+$/;

interface FieldError {
  text: string;
}

interface FormErrors {
  claimNumber?: FieldError;
  accessCode?: FieldError;
}

const API_ERROR_MESSAGES: Record<AccessCodeValidationError, { field: 'claimNumber' | 'accessCode'; text: string }> = {
  not_found: {
    field: 'claimNumber',
    text: 'We cannot find that claim number. Enter the claim number that you received from the court',
  },
  expired: {
    field: 'accessCode',
    text: 'The access code you entered has expired. Contact the court to get a new code',
  },
  already_used: {
    field: 'accessCode',
    text: 'The access code you entered has already been used, you should contact the court',
  },
  mismatch: {
    field: 'accessCode',
    text: 'Access code does not match claim number',
  },
  unknown: {
    field: 'claimNumber',
    text: 'We cannot find that claim number. Enter the claim number that you received from the court',
  },
};

function buildErrorList(errors: FormErrors): { text: string; href: string }[] {
  const list: { text: string; href: string }[] = [];
  if (errors.claimNumber) {
    list.push({ text: errors.claimNumber.text, href: '#claimNumber' });
  }
  if (errors.accessCode) {
    list.push({ text: errors.accessCode.text, href: '#accessCode' });
  }
  return list;
}

function renderForm(res: Response, errors: FormErrors = {}, claimNumber = '', accessCode = ''): void {
  res.render('accessCode', {
    errors,
    errorList: buildErrorList(errors),
    claimNumber,
    accessCode,
  });
}

export default function citizenCaseLinkRoutes(app: Application): void {
  app.get('/access-your-case', oidcMiddleware, (_req: Request, res: Response) => {
    return renderForm(res);
  });

  app.post('/access-your-case', oidcMiddleware, async (req: Request, res: Response) => {
    const claimNumber = typeof req.body.claimNumber === 'string' ? req.body.claimNumber.trim() : '';
    const accessCode = typeof req.body.accessCode === 'string' ? req.body.accessCode.trim() : '';
    const userAccessToken = req.session.user?.accessToken;

    if (!userAccessToken) {
      logger.error('No user access token in session on access-your-case page');
      return res.status(401).render('error', { error: 'Authentication required' });
    }

    const errors: FormErrors = {};

    // Claim number validation
    if (!claimNumber) {
      errors.claimNumber = { text: 'Enter your claim number' };
    } else if (!CLAIM_NUMBER_REGEX.test(claimNumber)) {
      errors.claimNumber = {
        text: 'Claim number must only include numbers 0 to 9 and special characters such as hyphens',
      };
    } else if (claimNumber.length < 16 || claimNumber.length > 20) {
      errors.claimNumber = { text: 'Claim number must be between 16 and 20 characters' };
    }

    // Access code validation
    if (!accessCode) {
      errors.accessCode = { text: 'Enter your access code' };
    } else if (!ACCESS_CODE_REGEX.test(accessCode)) {
      errors.accessCode = { text: 'Access code must only include letters a to z, and numbers 0 to 9' };
    } else if (accessCode.length !== 12) {
      errors.accessCode = { text: 'Access code must be 12 characters' };
    }

    if (errors.claimNumber || errors.accessCode) {
      return renderForm(res, errors, claimNumber, accessCode);
    }

    // Strip hyphens to get the internal 16-digit case ID
    const caseId = claimNumber.replace(/-/g, '');

    try {
      const result = await validateAccessCode(userAccessToken, caseId, accessCode);

      if (result.valid) {
        logger.info(`Access code validated successfully for case ${caseId}`);
        return safeRedirect303(res, `/dashboard/${caseId}`, '/', ['/dashboard']);
      }

      const { field, text } = API_ERROR_MESSAGES[result.error];
      errors[field] = { text };
      logger.warn(`Access code validation failed for case ${caseId}: ${result.error}`);
      return renderForm(res, errors, claimNumber, accessCode);
    } catch (err) {
      logger.error(`Failed to validate access code for case ${caseId}:`, err);
      errors.claimNumber = {
        text: 'We cannot find that claim number. Enter the claim number that you received from the court',
      };
      return renderForm(res, errors, claimNumber, accessCode);
    }
  });
}
