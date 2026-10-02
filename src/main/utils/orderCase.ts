import { buildHeaderModel } from '@hmcts-cft/cft-ui-component-lib';
import type { DocWeaveSnapshot } from '@hmcts-cft/docweave';
import config from 'config';
import type { Request } from 'express';

import { HTTPError } from '../HttpError';
import { linkSignOutToLogout } from '../middleware/legalRepresentativeHeaders';
import { getUserRoles } from '../steps/utils';
import { caseNumberFormatter } from '../steps/utils/caseNumberFormatter';

import type { MakeOrderType } from '@utils/makeOrderValidation';
import { buildManageCaseDetailsRedirect } from '@utils/manageCaseRedirect';

export type FormData = Record<string, unknown>;

export interface OrderParty {
  id: string;
  name: string;
}

/** The case an order is made on, as pcs-api sends it to the judge making it and the caseworker reviewing it. */
export interface OrderCaseContext {
  caseReference: number;
  propertyAddress?: Record<string, string | undefined>;
  claimants: OrderParty[];
  defendants: OrderParty[];
  caseFacts?: Record<string, unknown>;
  openCounterclaim?: boolean;
  openApplication?: boolean;
}

/**
 * What an order event sends when it starts: the order, and the case it is made on. The make order event
 * sends the judge their working order, if any, or the order a caseworker returned to them with its query; the
 * confirm order review event sends the caseworker the order awaiting review.
 */
export interface OrderStart {
  order: {
    id?: string;
    version: number;
    orderType?: MakeOrderType;
    formData?: FormData;
    docweaveSnapshot?: DocWeaveSnapshot | null;
    queryFromCaseworker?: string | null;
  };
  caseContext: OrderCaseContext;
}

export function formatAddress(address: Record<string, string | undefined> = {}): string {
  return ['AddressLine1', 'AddressLine2', 'AddressLine3', 'PostTown', 'County', 'PostCode', 'Country']
    .map(key => address[key])
    .filter(Boolean)
    .join(', ');
}

export interface OrderConfirmationHeader {
  caseReference: string;
  propertyAddress: string;
  caseName: string;
}

/** The case as a confirmation panel shows it: its number, property, and the claimant against the primary defendant. */
export function confirmationHeader(caseReference: string, caseContext: OrderCaseContext): OrderConfirmationHeader {
  const claimant = caseContext.claimants[0]?.name;
  const primaryDefendant = caseContext.defendants[0]?.name;
  return {
    caseReference: caseNumberFormatter(caseReference),
    propertyAddress: formatAddress(caseContext.propertyAddress),
    caseName: [claimant, primaryDefendant].filter(Boolean).join(' vs '),
  };
}

/** The case as the top of an order page shows it. */
export function caseHeader(caseContext: OrderCaseContext): Record<string, string> {
  return {
    caseReferenceDisplay: caseNumberFormatter(caseContext.caseReference),
    propertyAddressDisplay: formatAddress(caseContext.propertyAddress),
    claimantNames: caseContext.claimants.map(party => party.name).join(', '),
    defendantNames: caseContext.defendants.map(party => party.name).join(', '),
  };
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

export function manageCaseDetailsUrl(caseReference: string): string {
  const url = buildManageCaseDetailsRedirect(config.get('redirects.manageCaseReturnURL'), caseReference);
  if (!url) {
    throw new HTTPError('The Manage Case return URL is not configured', 500);
  }
  return url;
}

/**
 * CCD decides who may use an order event from their role assignments: anyone else is not given the
 * event's payload or allowed to submit it, and is shown the page does not exist.
 */
export function refusedByCcd(error: unknown): boolean {
  return error instanceof HTTPError && (error.status === 403 || error.status === 404);
}
