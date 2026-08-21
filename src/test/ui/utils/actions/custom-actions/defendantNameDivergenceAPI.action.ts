import { Page } from '@playwright/test';
// eslint-disable-next-line import/no-named-as-default
import Axios from 'axios';

import { VERY_SHORT_TIMEOUT, actionRetries } from '../../../../../../playwright.config';
import { defendantNameDivergenceApiData } from '../../../data/api-data';
import { IAction, actionData, actionRecord } from '../../interfaces';

/** The sweep runs every 30s on the repro preview; allow for form render plus a couple of missed sweeps. */
const DEFENCE_PACK_TIMEOUT_MS = 240_000;
const DEFENCE_PACK_POLL_MS = 5_000;

/** One party on the claim, as reported by pcs-api's HDPI-7686 testing-support endpoint. */
export interface PartyNames {
  partyId: string;
  role: string;
  rank: number | null;
  firstName: string | null;
  lastName: string | null;
  orgName: string | null;
  nameKnown: string | null;
  /** The name a coversheet addressed to this party carries (production RecipientAddressResolver). */
  coversheetName: string;
  /** The name a defence form about this party carries (DEFENDANT_NAME assertion, else fallback). */
  ownFormName: string;
  /** Raw JSON of this party's DEFENDANT_NAME assertion, null when they never asserted one. */
  defendantNameAssertion: string | null;
}

/** An enclosure in a dispatched pack. `self` marks the recipient's own filing. */
export interface PackDoc {
  documentId: string;
  documentType: string | null;
  defendantNumber: number | null;
  self: boolean;
}

/** One dispatched defence pack, from the claim_activity_log rows the ticket reads letter ids from. */
export interface SentPack {
  letterId: string | null;
  packType: string | null;
  status: string | null;
  recipientPartyId: string | null;
  recipientCoversheetName: string | null;
  documents: PackDoc[];
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
  async execute(page: Page, action: string, _fieldName?: actionData | actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['fetchDefendantNameReportAPI', () => this.fetchDefendantNameReportAPI()],
      ['waitForDefencePackAPI', () => this.waitForDefencePackAPI()],
    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  private async report(): Promise<CaseNameReport> {
    const api = Axios.create(defendantNameDivergenceApiData.defendantNameDivergenceApiInstance());
    const response = await api.get<CaseNameReport>(defendantNameDivergenceApiData.defendantNameDivergenceApiEndPoint());
    return response.data;
  }

  private async fetchDefendantNameReportAPI(): Promise<void> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= actionRetries; attempt++) {
      try {
        const data = await this.report();
        if (data?.parties?.length) {
          nameReport = data;
          this.logReport();
          return;
        }
        lastError = new Error('report contained no parties');
      } catch (error: unknown) {
        lastError = Axios.isAxiosError(error) ? new Error(`HTTP ${error.response?.status}`) : error;
      }
      await new Promise(res => setTimeout(res, VERY_SHORT_TIMEOUT));
    }

    nameReport = undefined;
    throw new Error(
      `Could not fetch the defendant name report for case ${process.env.CASE_NUMBER} after ${actionRetries} ` +
        `attempts: ${(lastError as Error)?.message}. Is testing-support enabled on the pcs-api under test?`
    );
  }

  /**
   * Waits for the bulk print sweep to actually post a defence pack. The sweep is a db-scheduler task
   * (BULK_PRINT_SCHEDULE, 30s on this preview) gated by the bulk-print-enabled flag, and it runs after the
   * defence form itself has been rendered by another scheduled task, so this is the slowest step in the journey.
   */
  private async waitForDefencePackAPI(): Promise<void> {
    const deadline = Date.now() + DEFENCE_PACK_TIMEOUT_MS;
    let lastSeen = 'nothing yet';

    while (Date.now() < deadline) {
      try {
        const data = await this.report();
        /*
         * A pack goes to every party, one letter at a time, so the first PACK_SENT row appearing does not mean
         * the responder's own letter has been posted yet. Wait until nothing is left pending - that is the sweep
         * having drained - otherwise the report is a snapshot of a half-finished dispatch.
         */
        if (data?.defencePacks?.length && !data.pendingDefencePacks?.length) {
          nameReport = data;
          this.logReport();
          const failed = data.defencePacks.filter(pack => pack.status !== 'SUCCESS');
          if (failed.length) {
            throw new Error(
              `Defence pack dispatch failed: ${failed.map(pack => pack.failureReason ?? 'unknown').join(', ')}`
            );
          }
          return;
        }
        lastSeen =
          `${data?.defencePacks?.length ?? 0} pack(s) posted, ` +
          `${data?.pendingDefencePacks?.length ?? 0} still pending`;
      } catch (error: unknown) {
        if (!Axios.isAxiosError(error)) {
          throw error;
        }
        lastSeen = `HTTP ${error.response?.status}`;
      }
      await new Promise(res => setTimeout(res, DEFENCE_PACK_POLL_MS));
    }

    throw new Error(
      `Defence packs for case ${process.env.CASE_NUMBER} were not all posted within ` +
        `${DEFENCE_PACK_TIMEOUT_MS / 1000}s (${lastSeen}). Is bulk-print-enabled on for this environment?`
    );
  }

  private logReport(): void {
    console.log(`Defendant name report for case ${process.env.CASE_NUMBER}:`);
    console.log(JSON.stringify(nameReport, null, 2));
  }
}
