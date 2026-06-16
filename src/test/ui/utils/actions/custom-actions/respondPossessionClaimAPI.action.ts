import { Page } from '@playwright/test';
// eslint-disable-next-line import/no-named-as-default
import Axios from 'axios';

import { respondPossessionClaimApiData } from '../../../data/api-data/respondPossessionClaim.api.data';
import { respondPossessionClaimEventTokenApiData } from '../../../data/api-data/respondPossessionClaimEventToken.api.data';
import { respondPossessionClaimMidEventApiData } from '../../../data/api-data/respondPossessionClaimMidEvent.api.data';
import { IAction, actionData, actionRecord } from '../../interfaces';

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
    const respondPossessionClaimApi = Axios.create(
      respondPossessionClaimEventTokenApiData.respondPossessionClaimApiInstance()
    );

    const RESPONDCLAIM_EVENT_TOKEN = (
      await respondPossessionClaimApi.get(respondPossessionClaimEventTokenApiData.respondPossessionClaimApiEndPoint())
    ).data.token;

    const respondPossessionClaimPayloadData: actionData =
      typeof caseData === 'object' && caseData !== null && 'data' in caseData
        ? (caseData.data as actionData)
        : caseData;

    const type = typeof caseData === 'object' && caseData !== null && 'type' in caseData ? caseData.type : 'both';

    switch (type) {
      case 'midEvent':
        await this.respondPossessionClaimMidEvent(respondPossessionClaimPayloadData);
        break;

      case 'submit':
        await this.submitRespondPossessionClaim(respondPossessionClaimApi, RESPONDCLAIM_EVENT_TOKEN);
        break;

      case 'both':
      default:
        await this.respondPossessionClaimMidEvent(respondPossessionClaimPayloadData);

        await this.submitRespondPossessionClaim(respondPossessionClaimApi, RESPONDCLAIM_EVENT_TOKEN);
    }
  }

  private async respondPossessionClaimMidEvent(payload: actionData): Promise<void> {
    try {
      const respondPossessionClaimMidEventApi = Axios.create(
        respondPossessionClaimMidEventApiData.respondPossessionClaimMidEventApiInstance()
      );
      const caseTypeId = process.env.CASE_TYPE_ID ?? 'PCS';
      console.log(caseTypeId);
      const midEventRequest = {
        event_id: respondPossessionClaimMidEventApiData.respondPossessionClaimEventName,
        case_details: {
          id: process.env.CASE_NUMBER,
          case_type_id: caseTypeId,
          data: payload,
        },
      };
      console.log('RESPONDTOCLAIM MID EVENT REQUEST:\n', JSON.stringify(midEventRequest, null, 2));

      const midEventResponse = await respondPossessionClaimMidEventApi.post(
        respondPossessionClaimMidEventApiData.respondPossessionClaimApiEndPoint(),
        midEventRequest
      );

      console.log('MID EVENT RESPONSE:\n', JSON.stringify(midEventResponse.data, null, 2));
    } catch (error: unknown) {
      if (Axios.isAxiosError(error)) {
        throw error;
      }

      throw new Error('respondPossessionClaimMidEvent failed due to an unexpected error.');
    }
  }

  private async submitRespondPossessionClaim(
    respondPossessionClaimApi: ReturnType<typeof Axios.create>,
    eventToken: string
  ): Promise<void> {
    const submitRequest = {
      data: respondPossessionClaimApiData.respondPossessionClaimPayload,

      event: {
        id: respondPossessionClaimApiData.respondPossessionClaimEventName,
        summary: 'Save draft',
        description: 'Defendant Responses - Multiple',
      },

      event_token: eventToken,
      ignore_warning: false,
    };

    try {
      console.log('RESPONDTOCLAIM SUBMIT REQUEST:\n', JSON.stringify(submitRequest, null, 2));

      await respondPossessionClaimApi.post(
        respondPossessionClaimApiData.respondPossessionClaimApiEndPoint(),
        submitRequest
      );
    } catch (error: unknown) {
      if (Axios.isAxiosError(error)) {
        throw error;
      }

      throw new Error('RESPONDTOCLAIM submission failed due to an unexpected error.');
    }
  }
}
