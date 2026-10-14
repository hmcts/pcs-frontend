import { buildHeaderModel } from '@hmcts-cft/cft-ui-component-lib';
import { type DocWeaveSnapshot, InvalidSnapshotError, parseSnapshot } from '@hmcts-cft/docweave';
import config from 'config';
import type { NextFunction, Request, Response } from 'express';

import { CallbackRejectedError, HTTPError } from '../HttpError';
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
  openCounterclaim?: boolean;
  openApplication?: boolean;
  /** The general application an order on one decides. */
  application?: OrderApplication | null;
}

/** A general application as the judge deciding it reads it, with what court staff said when they referred it. */
export interface OrderApplication {
  id: string;
  reference: string;
  type: string;
  somethingElseDetails?: string | null;
  applicant?: string | null;
  submittedOn?: string | null;
  within14Days?: 'YES' | 'NO' | null;
  otherPartiesAgreed?: 'YES' | 'NO' | null;
  withoutNotice?: 'YES' | 'NO' | null;
  withoutNoticeReason?: string | null;
  fee?: string | null;
  whatOrderWanted?: string | null;
  documents: { id: string; fileName: string }[];
  referredOn?: string | null;
  referralNote?: string | null;
}

/** A judicial note on the case, with the hearing it was made at, if any. */
export interface JudicialNote {
  by?: string | null;
  createdOn: string;
  hearingDate?: string | null;
  note: string;
}

/**
 * The hearing an order is made for. Its facts are this hearing's if they were recorded, otherwise the latest
 * earlier hearing's, otherwise the claim's, which no judge recorded. The version goes back with the judge's
 * facts, so pcs-api can refuse them if another judge has since recorded this hearing's.
 */
export interface OrderHearing {
  id: number;
  date: string;
  version?: number | null;
  caseFacts?: Record<string, unknown>;
  recorded?: { by?: string | null; on: string } | null;
  note?: string | null;
  earlierNotes: JudicialNote[];
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
    /** The general application the order decides, if it decides one. */
    genAppId?: string | null;
  };
  caseContext: OrderCaseContext;
  /** The hearing the order is made for, if it is made for one. */
  hearing?: OrderHearing | null;
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
 * Answers an order event that was refused. pcs-api refuses one with its reasons, which the page answers
 * if it can; otherwise the error handler logs them and shows a generic error. CCD decides who may use
 * an order event from their role assignments: anyone else is not given the event's payload or allowed
 * to submit it, and is shown the page does not exist.
 */
export function refusedOrderEvent(
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

/** The order's document as a page posted it: none, or a snapshot Docweave accepts. Anything else is a bad request. */
export function postedSnapshot(json: string | undefined): DocWeaveSnapshot | null {
  try {
    return json ? parseSnapshot(json) : null;
  } catch (error) {
    throw error instanceof InvalidSnapshotError ? new HTTPError(error.message, 400) : error;
  }
}
