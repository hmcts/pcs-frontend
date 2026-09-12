import { Page } from '@playwright/test';
// eslint-disable-next-line import/no-named-as-default
import Axios from 'axios';

import { SHORT_TIMEOUT, VERY_SHORT_TIMEOUT, actionRetries } from '../../../../../../playwright.config';
import { defendantNameDivergenceApiData } from '../../../data/api-data';
import { IAction, actionData, actionRecord } from '../../interfaces';

/**
 * One party as reported by pcs-api's HDPI-7686 testing-support endpoint. A defence pack goes to every
 * party on the claim, so this covers claimants too; only the responding defendant's own copy is expected
 * to carry the same name on the envelope and the enclosure.
 */
export interface PartyNames {
  partyId: string;
  role: string;
  rank: number | null;
  firstName: string | null;
  lastName: string | null;
  orgName: string | null;
  nameKnown: string | null;
  /** The name a coversheet addressed to this party would carry (production RecipientAddressResolver). */
  coversheetName: string;
  /** The name a defence form about this party would carry (DEFENDANT_NAME assertion, else fallback). */
  ownFormName: string;
  /** Raw JSON of this party's DEFENDANT_NAME assertion, null when they never asserted one. */
  defendantNameAssertion: string | null;
}

/** One defence pack actually dispatched, read from the claim_activity_log PACK_SENT / PACK_FAILED rows. */
export interface SentPack {
  letterId: string;
  packType: string | null;
  status: string | null;
  recipientPartyId: string | null;
  recipientCoversheetName: string | null;
  documents: { documentId: string; documentType: string | null; defendantNumber: number | null; self: boolean }[];
  failureReason: string | null;
  createdAt: string | null;
}

export interface PendingRecipient {
  partyId: string;
  letterType: string;
  recipientName: string;
}

export interface CaseNameReport {
  caseReference: number;
  caseId: string;
  parties: PartyNames[];
  defencePacks: SentPack[];
  pendingDefencePacks: PendingRecipient[];
}

let nameReport: CaseNameReport | undefined;

export function getDefendantNameReport(): CaseNameReport | undefined {
  return nameReport;
}

export class DefendantNameDivergenceAPIAction implements IAction {
  async execute(page: Page, action: string, fieldName?: actionData | actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['createTestCaseAPI', () => this.createTestCaseAPI(fieldName)],
      ['payClaimFeeAPI', () => this.payClaimFeeAPI()],
      ['fetchDefendantNameReportAPI', () => this.fetchDefendantNameReportAPI()],
    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  /**
   * Creates an issued case with defendant access codes in one call, and publishes the case reference the same
   * way createCaseAPI does so the rest of the framework is unaffected.
   */
  private async createTestCaseAPI(payloadMerge?: actionData | actionRecord): Promise<void> {
    const api = Axios.create(defendantNameDivergenceApiData.testCaseCreationApiInstance());
    const merge =
      payloadMerge && typeof payloadMerge === 'object' && 'data' in payloadMerge
        ? (payloadMerge as { data: unknown }).data
        : payloadMerge;

    const response = await api.post<{ caseId: number }>(
      defendantNameDivergenceApiData.createTestCaseApiEndPoint(),
      merge ?? {}
    );

    process.env.CASE_NUMBER = String(response.data.caseId);
    process.env.CASE_FID = process.env.CASE_NUMBER.replace(/(.{4})(?=.)/g, '$1 ');
  }

  /**
   * Confirms the claim fee as CCPay would, which fires claimIssuePayment and moves the case from
   * PENDING_CASE_ISSUED to CASE_ISSUED - the first state the defendant response event is available from.
   */
  private async payClaimFeeAPI(): Promise<void> {
    const api = Axios.create(defendantNameDivergenceApiData.defendantNameDivergenceApiInstance());

    let feePayment: { serviceRequestReference?: string; amount?: number } | undefined;
    for (let attempt = 1; attempt <= actionRetries; attempt++) {
      const response = await api.get<{ serviceRequestReference?: string; amount?: number }[]>(
        defendantNameDivergenceApiData.feePaymentInfoApiEndPoint()
      );
      feePayment = response.data?.find(payment => payment.serviceRequestReference);
      if (feePayment) {
        break;
      }
      // The service request is written by the fee/pay db-scheduler task, so this can take seconds.
      await new Promise(res => setTimeout(res, SHORT_TIMEOUT));
    }

    if (!feePayment?.serviceRequestReference) {
      throw new Error(`No service request reference was created for case ${process.env.CASE_NUMBER}`);
    }

    await api.put(
      defendantNameDivergenceApiData.paymentCallbackApiEndPoint,
      defendantNameDivergenceApiData.paidServiceRequestCallback(
        feePayment.serviceRequestReference,
        Number(feePayment.amount ?? 0)
      )
    );
  }

  private async fetchDefendantNameReportAPI(): Promise<void> {
    const api = Axios.create(defendantNameDivergenceApiData.defendantNameDivergenceApiInstance());
    const maxRetries = actionRetries;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await api.get<CaseNameReport>(
          defendantNameDivergenceApiData.defendantNameDivergenceApiEndPoint()
        );
        // The DEFENDANT_NAME assertion is written by the submit callback, so wait for it to appear rather
        // than asserting against a report taken before the submission landed.
        const hasAssertion = response.data?.parties?.some(party => party.defendantNameAssertion);
        if (hasAssertion) {
          nameReport = response.data;
          console.log(`Defendant name report for case ${process.env.CASE_NUMBER}:`);
          console.log(JSON.stringify(nameReport, null, 2));
          return;
        }
        lastError = new Error(
          response.data?.parties?.length ? 'no party has a DEFENDANT_NAME assertion yet' : 'report contained no parties'
        );
      } catch (error: unknown) {
        lastError = Axios.isAxiosError(error) ? new Error(`HTTP ${error.response?.status}`) : error;
      }
      await new Promise(res => setTimeout(res, VERY_SHORT_TIMEOUT));
    }

    nameReport = undefined;
    throw new Error(
      `Could not fetch the defendant name report for case ${process.env.CASE_NUMBER} after ${maxRetries} attempts: ` +
        `${(lastError as Error)?.message}. Is testing-support enabled on the pcs-api under test?`
    );
  }
}
