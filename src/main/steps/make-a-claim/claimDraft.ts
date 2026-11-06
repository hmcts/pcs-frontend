import type { Request } from 'express';
import { cloneDeep } from 'lodash';

import { HTTPError } from '../../HttpError';

import type { CcdDraftEvent } from '@modules/documents/storage';
import type { CcdCase } from '@services/ccdCase.interface';
import { CcdCaseModel } from '@services/ccdCaseData.model';
import { ccdCaseService } from '@services/ccdCaseService';
import type { CitizenPossessionClaim } from '@services/citizenPossessionClaim.interface';

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

/**
 * Drops answers a later change made unreachable, so the saved claim never holds details for a question the
 * claimant no longer sees.
 */
export function normaliseClaim(claim: CitizenPossessionClaim): CitizenPossessionClaim {
  const normalised = cloneDeep(claim);
  const { claimant, tenancy, grounds, notice, rentArrears, circumstances, otherInformation } = normalised;

  if (claimant?.individualOrOrganisation === 'INDIVIDUAL') {
    delete claimant.organisationName;
  }
  if (claimant?.individualOrOrganisation === 'ORGANISATION') {
    delete claimant.firstName;
    delete claimant.lastName;
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
  if (circumstances?.underlesseeExists === 'NO') {
    delete circumstances.underlesseeName;
    delete circumstances.underlesseeAddress;
  }
  if (otherInformation?.hasOtherReasons === 'NO') {
    delete otherInformation.otherReasonsDetail;
  }
  return normalised;
}

/** Saves the whole claim as the case's draft. The draft save replaces what was saved before. */
export async function saveClaimDraftForCase(
  accessToken: string,
  caseId: string,
  claim: CitizenPossessionClaim
): Promise<CcdCase> {
  return ccdCaseService.updateDraft(MAKE_A_CLAIM_DRAFT_EVENT, accessToken, caseId, {
    citizenPossessionClaim: normaliseClaim(claim),
  });
}

/** Saves the claim and keeps the request's case in step with it, for whatever the request renders next. */
export async function saveClaimDraft(req: Request, claim: CitizenPossessionClaim): Promise<void> {
  const accessToken = req.session?.user?.accessToken;
  const validatedCase = req.res?.locals.validatedCase;
  if (!accessToken || !validatedCase?.id) {
    throw new HTTPError('Cannot save the claim without a signed-in user and a case', 500);
  }
  const normalised = normaliseClaim(claim);
  const saved = await saveClaimDraftForCase(accessToken, validatedCase.id, normalised);
  if (req.res?.locals) {
    req.res.locals.validatedCase = new CcdCaseModel({
      id: validatedCase.id,
      data: {
        ...validatedCase.data,
        citizenPossessionClaim: saved.data?.citizenPossessionClaim ?? normalised,
      },
    });
  }
}

export interface ClaimFee {
  serviceRequestReference: string;
  feeAmount: string;
}

/** Submits the claim. pcs-api answers with the claim fee's service request when there is a fee to pay. */
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
 * first. It answers with the claim fee's service request when there is a fee to pay.
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
    {}
  );
  return claimFeeFrom(submitted);
}
