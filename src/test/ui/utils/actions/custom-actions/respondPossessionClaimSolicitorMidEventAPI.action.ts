import { Page } from '@playwright/test';
// eslint-disable-next-line import/no-named-as-default
import Axios from 'axios';

import { VERY_SHORT_TIMEOUT, actionRetries } from '../../../../../../playwright.config';
import { midEventLRRespondPossessionClaimApiData } from '../../../data/api-data/respondPossessionClaimMidEventLR.api.data';
import { IAction } from '../../interfaces';

export class RespondPossessionClaimLRMidEventAPIAction implements IAction {
  async execute(page: Page, action: string): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['midEventRespondPossessionClaimLRAPI', () => this.midEventRespondPossessionClaimLRAPI()],
    ]);

    const actionToPerform = actionsMap.get(action);

    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }

    await actionToPerform();
  }

  private async midEventRespondPossessionClaimLRAPI(): Promise<void> {
    const midEventHeader = midEventLRRespondPossessionClaimApiData.midEventLRRespondPossessionClaimApiInstance();
    const validateApi = Axios.create(midEventHeader);

    // Prime the draft: the START event creates the party-keyed draft row that the
    // mid-event save requires. Without it the callback throws UnsubmittedDataException.
    await validateApi.get(`/cases/${process.env.CASE_NUMBER}/event-triggers/respondPossessionClaim`);

    const maxRetries = actionRetries;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const midEventPayload = midEventLRRespondPossessionClaimApiData.midEventLRRespondPossessionClaimPayload();
      try {
        await validateApi.post(
          midEventLRRespondPossessionClaimApiData.midEventLRRespondPossessionClaimApiEndPoint(),
          midEventPayload
        );

        console.log("'\n✅ VALIDATE RESPOND POSSESSION CLAIM");
        console.log(`Mid event Successful for Case ${process.env.CASE_NUMBER}`);

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
          console.error('Callback errors:', responseBody?.callbackErrors);

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
          throw new Error('Validate Respond Possession Claim failed due to an unexpected error.');
        }

        console.warn(`⚠️ Retry attempt ${attempt} failed. Retrying...`);

        await new Promise(resolve => setTimeout(resolve, VERY_SHORT_TIMEOUT));
      }
    }
  }
}
