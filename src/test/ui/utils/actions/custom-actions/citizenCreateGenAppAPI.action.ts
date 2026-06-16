import { Page } from '@playwright/test';
// eslint-disable-next-line import/no-named-as-default
import Axios from 'axios';

import { citizenCreateGenAppApiData, citizenCreateGenAppEventTokenApiData } from '../../../data/api-data';
import { IAction, actionData, actionRecord } from '../../interfaces';

export class CitizenCreateGenAppAPIAction implements IAction {
  async execute(page: Page, action: string, fieldName: actionData | actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['citizenCreateGenAppAPI', () => this.citizenCreateGenAppAPI(fieldName)],
    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  private async citizenCreateGenAppAPI(caseData: actionData): Promise<void> {
    const citizenCreateGenAppApi = Axios.create(citizenCreateGenAppEventTokenApiData.citizenCreateGenAppApiInstance());
    const GENAPP_EVENT_TOKEN = (
      await citizenCreateGenAppApi.get(citizenCreateGenAppEventTokenApiData.citizenCreateGenAppApiEndPoint())
    ).data.token;
    const citizenCreateGenAppPayloadData =
      typeof caseData === 'object' && 'data' in caseData ? caseData.data : caseData;
    // create config instance (defaults to ADJOURN if nothing passed)

    const genAppApiConfig = citizenCreateGenAppApiData();

    try {
      await citizenCreateGenAppApi.post(genAppApiConfig.citizenCreateGenAppApiEndPoint(), {
        data: citizenCreateGenAppPayloadData,
        event: { id: genAppApiConfig.citizenCreateGenAppEventName },
        event_token: GENAPP_EVENT_TOKEN,
      });
    } catch (error: unknown) {
      if (Axios.isAxiosError(error)) {
        throw error;
      }

      throw new Error('GenApp submission failed due to an unexpected error.');
    }
  }
}
