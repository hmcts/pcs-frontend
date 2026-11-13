import config from 'config';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { isStaffUser } from '../steps/utils';
import { getLaunchDarklyFlag } from '../utils/getLaunchDarklyFlag';

import { buildManageCaseDetailsRedirect } from '@utils/manageCaseRedirect';

const FLAGGED_STAFF_JOURNEYS: readonly { flag: string; paths: readonly RegExp[] }[] = [
  {
    flag: 'make-order-enabled',
    paths: [
      /^\/cases\/\d+\/event\/ext:makeOrder$/,
      /^\/case\/\d+\/make-order(?:\/.*)?$/,
      /^\/cases\/\d+\/event\/ext:confirmOrderReview$/,
      /^\/case\/\d+\/confirm-order-review(?:\/.*)?$/,
      /^\/docweave\/templates(?:\/.*)?$/,
    ],
  },
  {
    flag: 'record-warrant-return-enabled',
    paths: [/^\/cases\/\d+\/event\/ext:recordWarrantReturn$/, /^\/case\/\d+\/record-warrant-return(?:\/.*)?$/],
  },
];

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

function isNonPagePath(path: string): boolean {
  return NON_PAGE_PATHS.some(pattern => pattern.test(path));
}

function getJourneyFlag(path: string): string | undefined {
  return FLAGGED_STAFF_JOURNEYS.find(journey => journey.paths.some(pattern => pattern.test(path)))?.flag;
}

function getStaffRedirectUrl(path: string): string {
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
 * unless the request is part of a supported judicial or caseworker journey. Each journey is only supported
 * while its feature flag is on; with it off, staff on that journey's routes are sent back too.
 */
export const staffXuiRedirectMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const path = decodePath(req.path);
  if (!isStaffUser(req) || isNonPagePath(path)) {
    return next();
  }
  const flag = getJourneyFlag(path);
  if (flag && (await getLaunchDarklyFlag(req, flag, false))) {
    return next();
  }

  return res.redirect(303, getStaffRedirectUrl(path));
};
