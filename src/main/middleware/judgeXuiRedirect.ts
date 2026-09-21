import config from 'config';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { isJudgeUser } from '../steps/utils';

import { buildManageCaseDetailsRedirect } from '@utils/manageCaseRedirect';

const JUDGE_JOURNEY_PATHS = [
  /^\/cases\/\d+\/event\/ext:makeOrder$/,
  /^\/case\/\d+\/make-order(?:\/.*)?$/,
  /^\/docweave\/templates(?:\/.*)?$/,
] as const;

const NON_PAGE_PATHS = [
  /^\/active$/,
  /^\/assets(?:\/.*)?$/,
  /^\/(?:health|info|ready|readiness|liveness)(?:\/.*)?$/,
] as const;

const CASE_PATH = /^\/case\/(\d+)(?:\/|$)/;

function isAllowedJudgePath(path: string): boolean {
  return [...JUDGE_JOURNEY_PATHS, ...NON_PAGE_PATHS].some(pattern => pattern.test(path));
}

function getJudgeRedirectUrl(path: string): string {
  const caseReference = CASE_PATH.exec(path)?.[1];
  if (caseReference) {
    const caseDetailsUrl = buildManageCaseDetailsRedirect(
      config.get<string>('redirects.manageCaseReturnURL'),
      caseReference
    );
    if (caseDetailsUrl) {
      return caseDetailsUrl;
    }
  }

  return config.get<string>('xui.uri');
}

/**
 * Judges use PCS through an explicit journey launched from XUI. Keep them out
 * of the citizen-facing entry points and return them to the case-management UI
 * unless the request is part of a supported judicial journey.
 */
export const judgeXuiRedirectMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  if (!isJudgeUser(req) || isAllowedJudgePath(req.path)) {
    return next();
  }

  return res.redirect(303, getJudgeRedirectUrl(req.path));
};
