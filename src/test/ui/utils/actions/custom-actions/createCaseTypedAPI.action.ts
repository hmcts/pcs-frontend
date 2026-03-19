import { Page } from '@playwright/test';
// eslint-disable-next-line import/no-named-as-default
import Axios from 'axios';
import { createCcdClient } from '@hmcts/ccd-event-runtime';

import { createCaseEventTokenApiData } from '../../../data/api-data';
import { IAction, actionData, actionRecord } from '../../interfaces';
import { caseInfo } from './createCaseAPI.action';
import { caseBindings } from '../../../../../main/generated/ccd/PCS/event-contracts';
import type { CreateClaimData } from '../../../../../main/generated/ccd/PCS/dto-types';

export class CreateCaseTypedAPIAction implements IAction {
  async execute(page: Page, action: string, fieldName: actionData | actionRecord): Promise<void> {
    if (action !== 'createCaseTypedAPI') {
      throw new Error(`No action found for '${action}'`);
    }
    await this.createCaseTypedAPI(fieldName);
  }

  private async createCaseTypedAPI(caseData: actionData): Promise<void> {
    const requestConfig = createCaseEventTokenApiData.createCaseApiInstance();
    const baseUrl = requestConfig.baseURL;
    if (!baseUrl) {
      throw new Error('Missing DATA_STORE_URL_BASE for createCaseTypedAPI');
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
      throw new Error('Create case response did not include a case id');
    }

    process.env.CASE_NUMBER = caseId;
    caseInfo.id = caseId;
    caseInfo.fid = caseId.replace(/(.{4})(?=.)/g, '$1-');
    caseInfo.state = String(createResponse.state ?? '');
  }
}
