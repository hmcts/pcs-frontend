import { Page } from '@playwright/test';
// eslint-disable-next-line import/no-named-as-default
import Axios from 'axios';
import { createCcdClient } from '@hmcts/ccd-event-runtime';

import {
  createCaseApiData,
  createCaseEventTokenApiData,
  submitCaseApiData,
  submitCaseEventTokenApiData,
} from '../../../data/api-data';
import { IAction, actionData, actionRecord } from '../../interfaces';
import { caseBindings } from '../../../../../main/generated/ccd/PCS/event-contracts';
import type { CreateClaimData } from '../../../../../main/generated/ccd/PCS/dto-types';

export const caseInfo: { id: string; fid: string; state: string } = { id: '', fid: '', state: '' };

export class CreateCaseAPIAction implements IAction {
  async execute(page: Page, action: string, fieldName: actionData | actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['createCaseAPI', () => this.createCaseAPI(fieldName)],
      ['submitCaseAPI', () => this.submitCaseAPI(fieldName)],
    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  private async createCaseAPI(caseData: actionData): Promise<void> {
    const requestConfig = createCaseEventTokenApiData.createCaseApiInstance();
    const baseUrl = requestConfig.baseURL;
    if (!baseUrl) {
      throw new Error('Missing DATA_STORE_URL_BASE for createCaseAPI');
    }

    const createCaseApi = Axios.create(requestConfig);
    const client = createCcdClient(
      {
        baseUrl,
        getAuthHeaders: () => (requestConfig.headers ?? {}) as Record<string, string>,
        transport: {
          get: async (url, headers) => (await createCaseApi.get(url, { headers })).data,
          post: async (url, data, headers) => (await createCaseApi.post(url, data, { headers })).data,
        },
      },
      caseBindings
    );
    const flow = await client.event('createPossessionClaim').start();
    const createCasePayloadData = (
      typeof caseData === 'object' && caseData !== null && 'data' in caseData ? caseData.data : caseData
    ) as Partial<CreateClaimData>;
    const createResponse = await flow.submit({
      ...flow.data,
      ...createCasePayloadData,
    } as CreateClaimData);
    const caseId = String(createResponse.id ?? '');
    if (!caseId) {
      throw new Error(`Create case response did not include a case id for ${createCaseApiData.createCaseEventName}`);
    }

    process.env.CASE_NUMBER = caseId;
    caseInfo.id = caseId;
    caseInfo.fid = caseId.replace(/(.{4})(?=.)/g, '$1-');
    caseInfo.state = String(createResponse.state ?? '');
  }

  private async submitCaseAPI(caseData: actionData): Promise<void> {
    const submitCaseApi = Axios.create(submitCaseEventTokenApiData.createCaseApiInstance());
    const SUBMIT_EVENT_TOKEN = (await submitCaseApi.get(submitCaseEventTokenApiData.submitCaseEventTokenApiEndPoint()))
      .data.token;
    const submitCasePayloadData = typeof caseData === 'object' && 'data' in caseData ? caseData.data : caseData;
    try {
      const submitResponse = await submitCaseApi.post(submitCaseApiData.submitCaseApiEndPoint(), {
        data: submitCasePayloadData,
        event: { id: submitCaseApiData.submitCaseEventName },
        event_token: SUBMIT_EVENT_TOKEN,
      });
      caseInfo.id = submitResponse.data.id;
      caseInfo.fid = submitResponse.data.id.replace(/(.{4})(?=.)/g, '$1-');
      caseInfo.state = submitResponse.data.state;
    } catch (error: unknown) {
      if (Axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 404) {
          console.error(submitCaseApiData.submitCasePayload);

          throw new Error(
            `Submission failed: endpoint not found (404). Please check the payload above.\n${error.message}`
          );
        }
        if (!status) {
          throw new Error('Submission failed: no response from server.');
        }
        throw new Error(`Submission failed with status ${status}.`);
      }
      throw new Error('Submission failed due to an unexpected error.');
    }
  }
}
