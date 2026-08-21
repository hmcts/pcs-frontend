import { Page } from '@playwright/test';
// eslint-disable-next-line import/no-named-as-default
import Axios from 'axios';

import { VERY_SHORT_TIMEOUT, actionRetries } from '../../../../../../playwright.config';
import { defendantNameDivergenceApiData } from '../../../data/api-data';
import { IAction } from '../../interfaces';

/** One defendant as reported by pcs-api's HDPI-7686 testing-support endpoint. */
export interface DefendantNames {
  partyId: string;
  rank: number | null;
  partyFirstName: string | null;
  partyLastName: string | null;
  partyOrgName: string | null;
  partyNameKnown: string | null;
  /** The name the bulk-print coversheet would carry (production RecipientAddressResolver). */
  coversheetName: string;
  /** The name the enclosed defence form would carry (DEFENDANT_NAME assertion, else fallback). */
  formName: string;
  /** Raw JSON of the defendant's DEFENDANT_NAME assertion, null when they never asserted one. */
  defendantNameAssertion: string | null;
  diverges: boolean;
}

export interface PackRecipientName {
  partyId: string;
  letterType: string;
  recipientName: string;
}

export interface CaseNameReport {
  caseReference: number;
  caseId: string;
  defendants: DefendantNames[];
  anyDivergence: boolean;
  resolvedDefencePackRecipients: PackRecipientName[];
}

let nameReport: CaseNameReport | undefined;

export function getDefendantNameReport(): CaseNameReport | undefined {
  return nameReport;
}

export class DefendantNameDivergenceAPIAction implements IAction {
  async execute(page: Page, action: string): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['fetchDefendantNameReportAPI', () => this.fetchDefendantNameReportAPI()],
    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
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
        if (response.data?.defendants?.length) {
          nameReport = response.data;
          console.log(`Defendant name report for case ${process.env.CASE_NUMBER}:`);
          console.log(JSON.stringify(nameReport, null, 2));
          return;
        }
        lastError = new Error('report contained no defendants');
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
