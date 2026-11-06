import { buildHeaderModel } from '@hmcts-cft/cft-ui-component-lib';
import config from 'config';
import type { NextFunction, Request, Response } from 'express';

import { CallbackRejectedError, HTTPError } from '../HttpError';
import { linkSignOutToLogout } from '../middleware/legalRepresentativeHeaders';
import { getUserRoles, normalizeYesNoValue } from '../steps/utils';

import type { CcdCaseData, CcdParty } from '@services/ccdCase.interface';
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
export function refusedXuiEvent(
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

/**
 * XUI's header as it shows it to the user. XUI adds a user's role assignments, such as judge, to their
 * IDAM roles to choose the header; pass the role assignment the page's CCD event is limited to.
 */
export function xuiHeaderModel(req: Request, roleAssignments: string[] = []): ReturnType<typeof buildHeaderModel> {
  const roles = [...getUserRoles(req), ...roleAssignments];
  const headerModel = buildHeaderModel({ xuiBaseUrl: config.get('xui.uri'), user: { roles } });
  headerModel.assetsPath = '/assets/ui-component-lib';
  linkSignOutToLogout(headerModel);
  return headerModel;
}

export function getClaimantNames(ccdCase: CcdCaseData): string {
  return (ccdCase.allClaimants ?? [])
    .map(({ value: party }) => party.orgName ?? `${party.firstName} ${party.lastName}`)
    .join(', ');
}

export function getDefendantNames(ccdCase: CcdCaseData): string {
  const defendants = (ccdCase.allDefendants ?? []).map(({ value: party }) => party);
  const isNameUnknown = (party: CcdParty) => normalizeYesNoValue(party.nameKnown) === 'NO';

  const names = defendants
    .filter(party => !isNameUnknown(party))
    .map(party => `${party.firstName} ${party.lastName}`);

  if (defendants.some(isNameUnknown)) {
    names.push('Persons unknown');
  }

  return names.join(', ');
}
