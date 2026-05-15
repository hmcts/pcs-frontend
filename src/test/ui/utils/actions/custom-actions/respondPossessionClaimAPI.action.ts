import { Page } from '@playwright/test';
// eslint-disable-next-line import/no-named-as-default
import Axios from 'axios';

import { IAction, actionData, actionRecord } from '../../interfaces';
import { respondPossessionClaimEventTokenApiData } from '../../../data/api-data/respondPossessionClaimEventToken.api.data';
import { respondPossessionClaimApiData } from '../../../data/api-data/respondPossessionClaim.api.data';
import { respondPossessionClaimMidEventApiData } from '../../../data/api-data/respondPossessionClaimMidEvent.api.data';

export class respondPossessionClaimAPIAction implements IAction {
  async execute(page: Page, action: string, fieldName: actionData | actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['respondPossessionClaimAPI', () => this.respondPossessionClaimAPI(fieldName)],
    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  private async respondPossessionClaimAPI(caseData: actionData): Promise<void> {
    const respondPossessionClaimApi = Axios.create(respondPossessionClaimEventTokenApiData.respondPossessionClaimApiInstance());
    const RESPONDCLAIM_EVENT_TOKEN = (
      await respondPossessionClaimApi.get(respondPossessionClaimEventTokenApiData.respondPossessionClaimApiEndPoint())
    ).data.token;
    const respondPossessionClaimPayloadData =
      typeof caseData === 'object' && 'data' in caseData ? caseData.data : caseData;

    /**MID EVENT - respondPossessionClaimMidEvent*/

    try {
      await respondPossessionClaimApi.post(
        respondPossessionClaimMidEventApiData.respondPossessionClaimApiEndPoint(),{
         event: { id: respondPossessionClaimMidEventApiData.respondPossessionClaimEventName },     
          case_details: {
            id: process.env.CASE_NUMBER,
           // id: respondPossessionClaimMidEventApiData.caseId,
           case_type_id: 'PCS-1732',
            data: respondPossessionClaimPayloadData,
          },
        }
      );
    } catch (error: unknown) {
      if (Axios.isAxiosError(error)) {
        const status = error.response?.status;
        throw new Error(
          `respondPossessionClaimMidEvent mid-event failed${status ? ` with status ${status}` : ''
          }. ${error.message}`
        );
      }
      throw new Error('respondPossessionClaimMidEvent mid-event failed due to an unexpected error.');
    }
    /**SUBMIT EVENT - respondPossessionClaim*/
    try {
      await respondPossessionClaimApi.post(respondPossessionClaimApiData.respondPossessionClaimApiEndPoint(), {
        data: respondPossessionClaimPayloadData,
        event: { id: respondPossessionClaimApiData.respondPossessionClaimEventName },
        event_token: RESPONDCLAIM_EVENT_TOKEN,
      });
    } catch (error: unknown) {
      if (Axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 404) {
          console.error(respondPossessionClaimApiData.respondPossessionClaimPayload);

          throw new Error(
            `RESPONDTOCLAIM submission failed: endpoint not found (404). Please check the payload above.\n${error.message}`
          );
        }
        if (!status) {
          throw new Error('RESPONDTOCLAIM submission failed: no response from server.');
        }
        throw new Error(`RESPONDTOCLAIM submission failed with status ${status}.`);
      }
      throw new Error('RESPONDTOCLAIM submission failed due to an unexpected error.');
    }
  }

}
