import type { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware/oidc';

import { getTranslationFunction } from '@modules/i18n';
import { Logger } from '@modules/logger';
import { type AccessCodeValidationError, validateAccessCode } from '@services/pcsApi/pcsApiService';
import { isRespondToClaimEnabledForUser } from '@utils/isRespondToClaimEnabledForUser';
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

interface ErrorListItem {
  text: string;
  href?: string;
}

interface RenderFormOptions {
  errors?: FormErrors;
  claimNumber?: string;
  accessCode?: string;
  respondToClaimBlocked?: boolean;
  blockedMessage?: string;
}

// Keys under accessCode:errors.* in the en and cy locale files.
const API_ERROR_MESSAGES: Record<AccessCodeValidationError, { field: 'claimNumber' | 'accessCode'; key: string }> = {
  not_found: { field: 'claimNumber', key: 'claimNotFound' },
  expired: { field: 'accessCode', key: 'accessCodeExpired' },
  already_used: { field: 'accessCode', key: 'accessCodeAlreadyUsed' },
  mismatch: { field: 'accessCode', key: 'accessCodeMismatch' },
  unknown: { field: 'claimNumber', key: 'claimNotFound' },
};

function buildErrorList(errors: FormErrors, blockedMessage?: string): ErrorListItem[] {
  const list: ErrorListItem[] = [];

  if (blockedMessage) {
    list.push({ text: blockedMessage });
  }

  if (errors.claimNumber) {
    list.push({ text: errors.claimNumber.text, href: '#claimNumber' });
  }
  if (errors.accessCode) {
    list.push({ text: errors.accessCode.text, href: '#accessCode' });
  }
  return list;
}

function renderForm(res: Response, options: RenderFormOptions = {}): void {
  const { errors = {}, claimNumber = '', accessCode = '', respondToClaimBlocked = false, blockedMessage } = options;

  res.render('accessCode', {
    errors,
    errorList: buildErrorList(errors, blockedMessage),
    claimNumber,
    accessCode,
    respondToClaimBlocked,
    blockedMessage,
  });
}

async function getErrorTranslator(req: Request): Promise<(key: string) => string> {
  await req.i18n?.loadNamespaces(['accessCode']);
  const t = getTranslationFunction(req, ['accessCode']);
  return (key: string) => t(`accessCode:errors.${key}`);
}

async function getRespondToClaimBlockedMessage(req: Request): Promise<string> {
  return (await getErrorTranslator(req))('respondToClaimUnavailable');
}

async function renderRespondToClaimBlockedForm(
  req: Request,
  res: Response,
  claimNumber = '',
  accessCode = ''
): Promise<void> {
  const blockedMessage = await getRespondToClaimBlockedMessage(req);
  renderForm(res, {
    respondToClaimBlocked: true,
    blockedMessage,
    claimNumber,
    accessCode,
  });
}

export default function citizenCaseLinkRoutes(app: Application): void {
  app.get('/access-your-case', oidcMiddleware, async (req: Request, res: Response) => {
    if (!(await isRespondToClaimEnabledForUser(req))) {
      return renderRespondToClaimBlockedForm(req, res);
    }

    return renderForm(res);
  });

  app.post('/access-your-case', oidcMiddleware, async (req: Request, res: Response) => {
    const claimNumber = typeof req.body.claimNumber === 'string' ? req.body.claimNumber.trim() : '';
    const accessCode = typeof req.body.accessCode === 'string' ? req.body.accessCode.trim() : '';

    if (!(await isRespondToClaimEnabledForUser(req))) {
      return renderRespondToClaimBlockedForm(req, res, claimNumber, accessCode);
    }

    const userAccessToken = req.session.user?.accessToken;

    if (!userAccessToken) {
      logger.error('No user access token in session on access-your-case page');
      return res.status(401).render('error', { error: 'Authentication required' });
    }

    const errors: FormErrors = {};
    const errorText = await getErrorTranslator(req);

    // Claim number validation
    if (!claimNumber) {
      errors.claimNumber = { text: errorText('claimNumberRequired') };
    } else if (!CLAIM_NUMBER_REGEX.test(claimNumber)) {
      errors.claimNumber = { text: errorText('claimNumberInvalidCharacters') };
    } else if (claimNumber.length < 16 || claimNumber.length > 20) {
      errors.claimNumber = { text: errorText('claimNumberLength') };
    }

    // Access code validation
    if (!accessCode) {
      errors.accessCode = { text: errorText('accessCodeRequired') };
    } else if (!ACCESS_CODE_REGEX.test(accessCode)) {
      errors.accessCode = { text: errorText('accessCodeInvalidCharacters') };
    } else if (accessCode.length !== 12) {
      errors.accessCode = { text: errorText('accessCodeLength') };
    }

    if (errors.claimNumber || errors.accessCode) {
      return renderForm(res, { errors, claimNumber, accessCode });
    }

    // Strip hyphens to get the internal 16-digit case ID
    const caseId = claimNumber.replace(/-/g, '');

    try {
      const result = await validateAccessCode(userAccessToken, caseId, accessCode);

      if (result.valid) {
        logger.info(`Access code validated successfully for case ${caseId}`);
        return safeRedirect303(res, `/case/${caseId}/dashboard`, '/', ['/case']);
      }

      const { field, key } = API_ERROR_MESSAGES[result.error];
      errors[field] = { text: errorText(key) };
      logger.warn(`Access code validation failed for case ${caseId}: ${result.error}`);
      return renderForm(res, { errors, claimNumber, accessCode });
    } catch (err) {
      logger.error(`Failed to validate access code for case ${caseId}:`, err);
      errors.claimNumber = { text: errorText('claimNotFound') };
      return renderForm(res, { errors, claimNumber, accessCode });
    }
  });
}
