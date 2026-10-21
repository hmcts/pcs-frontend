import config from 'config';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { isStaffUser } from '../steps/utils';
import { getLaunchDarklyFlag } from '../utils/getLaunchDarklyFlag';

import { buildManageCaseDetailsRedirect } from '@utils/manageCaseRedirect';

const JUDGE_JOURNEY_PATHS = [
  /^\/cases\/\d+\/event\/ext:makeOrder$/,
  /^\/case\/\d+\/make-order(?:\/.*)?$/,
  /^\/cases\/\d+\/event\/ext:confirmOrderReview$/,
  /^\/case\/\d+\/confirm-order-review(?:\/.*)?$/,
  /^\/docweave\/templates(?:\/.*)?$/,
] as const;

const NON_PAGE_PATHS = [
  /^\/active$/,
  /^\/assets(?:\/.*)?$/,
  /^\/(?:health|info|ready|readiness|liveness)(?:\/.*)?$/,
] as const;

const CASE_PATH = /^\/cases?\/(\d+)(?:\/|$)/;

/** XUI encodes the event id it hands over, so `ext:makeOrder` arrives as `ext%3AmakeOrder`. */
function decodePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

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
 * Staff and judges use PCS through an explicit journey launched from XUI. Keep them out
 * of the citizen-facing entry points and return them to the case-management UI
 * unless the request is part of a supported judicial or caseworker order journey. Only while make order is
 * enabled.
 */
export const judgeXuiRedirectMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const path = decodePath(req.path);
  if (!isStaffUser(req) || isAllowedJudgePath(path)) {
    return next();
  }
  if (!(await getLaunchDarklyFlag(req, 'make-order-enabled', false))) {
    return next();
  }

  return res.redirect(303, getJudgeRedirectUrl(path));
};
