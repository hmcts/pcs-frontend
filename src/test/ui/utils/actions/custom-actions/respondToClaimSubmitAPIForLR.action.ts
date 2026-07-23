import { Page } from '@playwright/test';
// eslint-disable-next-line import/no-named-as-default
import Axios from 'axios';

import { VERY_SHORT_TIMEOUT, actionRetries } from '../../../../../../playwright.config';
import { respondPossessionClaimSolicitorEventTokenApiData } from '../../../data/api-data';
import { submitPossessionClaimResponseApiDataForLR } from '../../../data/api-data/respondPossessionClaimSubmitLR.api.data';
import { IAction } from '../../interfaces';

export class SubmitPossessionClaimResponseAPIAction implements IAction {
  async execute(page: Page, action: string): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['submitPossessionClaimResponseLRAPI', () => this.submitPossessionClaimResponseLRAPI()],
    ]);

    const actionToPerform = actionsMap.get(action);

    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }

    await actionToPerform();
  }

  private async submitPossessionClaimResponseLRAPI(): Promise<void> {
    const submitPossessionClaimResponseApi = Axios.create(
      submitPossessionClaimResponseApiDataForLR.submitPossessionClaimResponseApiInstance()
    );

    const RESPONDCLAIM_EVENT_TOKEN = (
      await submitPossessionClaimResponseApi.get(
        respondPossessionClaimSolicitorEventTokenApiData.respondPossessionClaimSolicitorApiEndPoint()
      )
    ).data.token;

    const maxRetries = actionRetries;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await submitPossessionClaimResponseApi.post(
          submitPossessionClaimResponseApiDataForLR.submitPossessionClaimResponseApiEndPoint(),
          submitPossessionClaimResponseApiDataForLR.submitPossessionClaimResponsePayload(RESPONDCLAIM_EVENT_TOKEN)
        );

        console.log('\n✅ SUBMIT POSSESSION CLAIM RESPONSE:');
        console.log(`Successfully submitted possession claim response for Case number ${process.env.CASE_NUMBER}`);

        break;
      } catch (error: unknown) {
        if (Axios.isAxiosError(error)) {
          const status = error.response?.status;
          const responseBody = error.response?.data;

          console.error('=== ERROR RESPONSE ===');
          console.error('HTTP Status:', status);
          console.error('Exception:', responseBody?.exception);
          console.error('Error:', responseBody?.error);
          console.error('Message:', responseBody?.message);
          console.error('Path:', responseBody?.path);
          console.error('Timestamp:', responseBody?.timestamp);

          if (status === 404) {
            throw error;
          }

          if (attempt === maxRetries) {
            throw error;
          }

          console.warn(`⚠️ Retry attempt ${attempt} failed. Retrying...`);

          await new Promise(resolve => setTimeout(resolve, VERY_SHORT_TIMEOUT));

          continue;
        }

        if (attempt === maxRetries) {
          throw new Error('Submitting possession claim response failed due to an unexpected error.');
        }

        console.warn(`⚠️ Retry attempt ${attempt} failed. Retrying...`);

        await new Promise(resolve => setTimeout(resolve, VERY_SHORT_TIMEOUT));
      }
    }
  }
}
