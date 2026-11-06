import type { Request } from 'express';
import { cloneDeep, isEqual } from 'lodash';

import { CallbackRejectedError, HTTPError } from '../../HttpError';
import { parseDraftVersion } from '../utils/buildDraftDefendantResponse';

import { UNREADABLE } from './formValues';

import type { CcdDraftEvent } from '@modules/documents/storage';
import type { CcdCase } from '@services/ccdCase.interface';
import { CcdCaseModel } from '@services/ccdCaseData.model';
import { ccdCaseService } from '@services/ccdCaseService';
import {
  type CitizenPossessionClaim,
  NOTICE_METHOD_DETAILS,
  type NoticeMethod,
  OTHER_GROUND,
} from '@services/citizenPossessionClaim.interface';

export const MAKE_A_CLAIM_EVENT_ID = 'citizenMakePossessionClaim';

export const MAKE_A_CLAIM_DRAFT_EVENT: CcdDraftEvent = {
  id: MAKE_A_CLAIM_EVENT_ID,
  pageId: 'citizenMakePossessionClaimDraftSavePage',
} as const;

/** The claim as last saved, from the case the request's event start loaded. */
export function readClaim(req: Request): CitizenPossessionClaim {
  return req.res?.locals.validatedCase?.data?.citizenPossessionClaim ?? {};
}

/** A copy of the saved claim for a step to change and save. */
export function draftClaim(req: Request): CitizenPossessionClaim {
  return cloneDeep(readClaim(req));
}

/** The rent history each way of proving the arrears keeps; the evidence of the others is dropped. */
const PROOF_EVIDENCE = {
  UPLOAD_STATEMENT: 'rentStatementDocuments',
  LEDGER: 'rentHistoryLedger',
  TABLE: 'rentHistoryTable',
} as const;

function keepOnlyProof(rentArrears: NonNullable<CitizenPossessionClaim['rentArrears']>): void {
  for (const [proofType, evidence] of Object.entries(PROOF_EVIDENCE)) {
    if (proofType !== rentArrears.proofType) {
      delete rentArrears[evidence];
    }
  }
}

/**
 * Drops answers a later change made unreachable, so the saved claim never holds details for a question the
 * claimant no longer sees.
 */
export function normaliseClaim(claim: CitizenPossessionClaim): CitizenPossessionClaim {
  const normalised = cloneDeep(claim);
  const { claimant, tenancy, grounds, notice, circumstances, otherInformation } = normalised;

  if (claimant?.individualOrOrganisation === 'INDIVIDUAL') {
    delete claimant.organisationName;
  }
  if (claimant?.individualOrOrganisation === 'ORGANISATION') {
    delete claimant.firstName;
    delete claimant.lastName;
  }
  for (const defendant of normalised.defendants ?? []) {
    if (defendant.value.nameKnown === 'NO') {
      delete defendant.value.firstName;
      delete defendant.value.lastName;
    }
    if (defendant.value.addressSameAsProperty === 'YES') {
      delete defendant.value.address;
    }
  }
  if (claimant?.contactByText === 'NO') {
    delete claimant.textMessageNumber;
  }
  if (claimant?.contactByPhone === 'NO') {
    delete claimant.phoneNumber;
    delete claimant.contactByText;
    delete claimant.textMessageNumber;
  }
  if (tenancy?.tenancyType && tenancy.tenancyType !== 'OTHER') {
    delete tenancy.otherTenancyTypeDetails;
  }
  if (tenancy?.tenancyAgreementAvailable === 'NO') {
    delete tenancy.tenancyAgreementDocuments;
  }
  if (tenancy?.tenancyAgreementAvailable === 'YES') {
    delete tenancy.noTenancyAgreementReason;
  }
  if (grounds?.hasRentArrearsGrounds === 'NO') {
    delete grounds.rentArrearsGrounds;
    delete grounds.hasOtherGrounds;
    delete normalised.rentArrears;
  }
  const { rentArrears } = normalised;
  if (grounds?.otherGrounds && !grounds.otherGrounds.includes(OTHER_GROUND)) {
    delete grounds.otherGroundsDetails;
  }
  if (grounds?.hasOtherGrounds === 'NO') {
    delete grounds.otherGrounds;
    delete grounds.otherGroundsDetails;
    delete grounds.groundReasons;
  }
  if (notice?.noticeServed === 'NO') {
    normalised.notice = { noticeServed: 'NO', noNoticeReason: notice.noNoticeReason };
    if (normalised.rentArrears) {
      delete normalised.rentArrears.arrearsAtNoticeDate;
    }
  }
  if (notice?.noticeMethods) {
    const details = notice as Record<string, unknown>;
    for (const [method, { date, details: detail }] of Object.entries(NOTICE_METHOD_DETAILS)) {
      if (!notice.noticeMethods.includes(method as NoticeMethod)) {
        delete details[date];
        if (detail) {
          delete details[detail];
        }
      }
    }
  }
  if (notice?.noticeType && notice.noticeType !== 'OTHER') {
    delete notice.noticeTypeOther;
  }
  if (notice?.noticeAvailable === 'NO') {
    delete notice.noticeDocuments;
  }
  if (notice?.noticeAvailable === 'YES') {
    delete notice.noticeUnavailableReason;
  }
  if (rentArrears?.rentFrequency && rentArrears.rentFrequency !== 'OTHER') {
    delete rentArrears.otherFrequencyDetails;
  }
  if (rentArrears?.rentFrequency && rentArrears.rentFrequency !== 'MONTHLY') {
    delete rentArrears.rentDueDay;
  }
  if (rentArrears?.rentFrequency === 'OTHER' && rentArrears.proofType === 'TABLE') {
    delete rentArrears.proofType;
    delete rentArrears.rentHistoryTable;
  }
  if (rentArrears?.proofType) {
    keepOnlyProof(rentArrears);
  }
  if (normalised.defendants?.length) {
    normalised.additionalDefendants = normalised.defendants.length > 1 ? 'YES' : 'NO';
  }
  if (circumstances && circumstances.underlesseeExists !== 'YES') {
    delete circumstances.underlesseeName;
    delete circumstances.underlesseeAddress;
  }
  if (otherInformation?.hasOtherReasons === 'NO') {
    delete otherInformation.otherReasonsDetail;
  }
  return normalised;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The saved collection item an edited one stands for: the same id, the same ground, or else the same position. */
function savedItemFor(saved: unknown[], item: unknown, index: number): unknown {
  if (isPlainObject(item)) {
    const value = isPlainObject(item.value) ? item.value : {};
    const match = saved.find(
      candidate =>
        isPlainObject(candidate) &&
        ((item.id && candidate.id === item.id) ||
          (value.ground && isPlainObject(candidate.value) && candidate.value.ground === value.ground))
    );
    if (match) {
      return match;
    }
  }
  return saved[index];
}

/**
 * Puts the saved answer back wherever the page's answer could not be read ({@link UNREADABLE}), field by field,
 * inside edited collection items too. Answers left empty stay cleared.
 */
export function restoreUnreadable<T>(saved: unknown, updated: T): T {
  if (updated === UNREADABLE) {
    return (saved === UNREADABLE ? undefined : saved) as T;
  }
  if (Array.isArray(updated)) {
    const savedItems = Array.isArray(saved) ? saved : [];
    return updated.map((item, index) => restoreUnreadable(savedItemFor(savedItems, item, index), item)) as T;
  }
  if (isPlainObject(updated)) {
    const savedObject = isPlainObject(saved) ? saved : {};
    return Object.fromEntries(
      Object.entries(updated).map(([key, value]) => [key, restoreUnreadable(savedObject[key], value)])
    ) as T;
  }
  return updated;
}

/**
 * Applies a page's answers to a copy of the saved claim, keeping saved answers the page's could not replace. The
 * claim keeps the draft version the page was showing, so a save after another tab's is refused.
 */
export function answeredClaim(req: Request, apply: (claim: CitizenPossessionClaim) => void): CitizenPossessionClaim {
  const claim = draftClaim(req);
  apply(claim);
  const shownVersion = parseDraftVersion(req.body?.draftVersion);
  return {
    ...restoreUnreadable(readClaim(req), claim),
    ...(shownVersion !== undefined ? { draftVersion: shownVersion } : {}),
  };
}

function sendDraft(accessToken: string, caseId: string, normalised: CitizenPossessionClaim): Promise<CcdCase> {
  return ccdCaseService.updateDraft(MAKE_A_CLAIM_DRAFT_EVENT, accessToken, caseId, {
    citizenPossessionClaim: normalised,
  });
}

/** Saves the whole claim as the case's draft. The draft save replaces what was saved before. */
export async function saveClaimDraftForCase(
  accessToken: string,
  caseId: string,
  claim: CitizenPossessionClaim
): Promise<CcdCase> {
  return sendDraft(accessToken, caseId, normaliseClaim(claim));
}

/**
 * The claimant's answers alone: without what pcs-api owns and without collection ids, which each request makes,
 * and with lists of choices in a fixed order, since pcs-api keeps them as sets and returns them in any order.
 */
function answersOf(claim: CitizenPossessionClaim | undefined): unknown {
  const { draftVersion: _version, propertyAddress: _address, submission, ...answers } = claim ?? {};
  const { serviceRequestReference: _reference, feeAmount: _fee, paymentStatus: _status, ...signed } = submission ?? {};
  const withoutIds = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      const items = value.map(withoutIds);
      return items.every(item => typeof item === 'string') ? [...(items as string[])].sort() : items;
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key, item]) => key !== 'id' && item !== undefined)
          .map(([key, item]) => [key, withoutIds(item)])
      );
    }
    return value;
  };
  return withoutIds({ ...answers, submission: signed });
}

/**
 * Saves the claim as the version the page was showing, and keeps the request's case in step with it. A save
 * refused because another tab saved first stays refused, but a repeat of a save that already went through (a
 * double click) is taken as done.
 */
export async function saveClaimDraft(req: Request, claim: CitizenPossessionClaim): Promise<void> {
  const accessToken = req.session?.user?.accessToken;
  const validatedCase = req.res?.locals.validatedCase;
  if (!accessToken || !validatedCase?.id) {
    throw new HTTPError('Cannot save the claim without a signed-in user and a case', 500);
  }
  const normalised = normaliseClaim(claim);
  let saved: CitizenPossessionClaim | undefined;
  try {
    saved = (await sendDraft(accessToken, validatedCase.id, normalised)).data?.citizenPossessionClaim;
  } catch (error) {
    if (!(error instanceof CallbackRejectedError && error.reasons.includes('DRAFT_CHANGED'))) {
      throw error;
    }
    const stored = (await ccdCaseService.getCaseByIdForEvent(accessToken, validatedCase.id, MAKE_A_CLAIM_EVENT_ID)).data
      ?.citizenPossessionClaim;
    if (!isEqual(answersOf(stored), answersOf(normalised))) {
      throw error;
    }
    saved = stored;
  }
  if (req.res?.locals) {
    req.res.locals.validatedCase = new CcdCaseModel({
      id: validatedCase.id,
      data: { ...validatedCase.data, citizenPossessionClaim: saved ?? normalised },
    });
  }
}

export interface ClaimFee {
  serviceRequestReference: string;
  feeAmount: string;
}

/** The claim fee pcs-api's submit created, from the confirmation it answers with or the claim it returns. */
export function claimFeeFrom(submitted: CcdCase): ClaimFee | undefined {
  const body = submitted.after_submit_callback_response?.confirmation_body;
  let confirmation: Partial<ClaimFee> = {};
  if (body) {
    try {
      confirmation = JSON.parse(body) as Partial<ClaimFee>;
    } catch {
      confirmation = {};
    }
  }
  const submission = submitted.data?.citizenPossessionClaim?.submission;
  const serviceRequestReference = confirmation.serviceRequestReference ?? submission?.serviceRequestReference;
  const feeAmount = confirmation.feeAmount ?? submission?.feeAmount;
  return serviceRequestReference && feeAmount ? { serviceRequestReference, feeAmount: String(feeAmount) } : undefined;
}

/**
 * Submits the claim. pcs-api submits the saved draft, not what the submit sends, so the last answers are saved
 * first and the submit names the draft version that save left. It answers with the claim fee's service request when there is a fee to pay.
 */
export async function submitClaim(req: Request, claim: CitizenPossessionClaim): Promise<ClaimFee | undefined> {
  const accessToken = req.session?.user?.accessToken;
  const caseId = req.res?.locals.validatedCase?.id;
  if (!accessToken || !caseId) {
    throw new HTTPError('Cannot submit the claim without a signed-in user and a case', 500);
  }
  await saveClaimDraft(req, claim);
  const started = await ccdCaseService.startCaseEvent(accessToken, caseId, MAKE_A_CLAIM_EVENT_ID);
  const submitted = await ccdCaseService.submitCaseEvent(
    accessToken,
    caseId,
    MAKE_A_CLAIM_EVENT_ID,
    started.eventToken,
    { citizenPossessionClaim: { draftVersion: readClaim(req).draftVersion } }
  );
  return claimFeeFrom(submitted);
}
