import { Page } from '@playwright/test';
// eslint-disable-next-line import/no-named-as-default
import Axios from 'axios';

import {
  createCaseApiData,
  createCaseEventTokenApiData,
  submitCaseApiData,
  submitCaseEventTokenApiData,
} from '../../../data/api-data';
import { IAction, actionData, actionRecord } from '../../interfaces';

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
    const createCaseApi = Axios.create(createCaseEventTokenApiData.createCaseApiInstance());
    const CREATE_EVENT_TOKEN = (await createCaseApi.get(createCaseEventTokenApiData.createCaseEventTokenApiEndPoint))
      .data.token;
    const createCasePayloadData = typeof caseData === 'object' && 'data' in caseData ? caseData.data : caseData;
    const createResponse = await createCaseApi.post(createCaseApiData.createCaseApiEndPoint, {
      data: createCasePayloadData,
      event: { id: createCaseApiData.createCaseEventName },
      event_token: CREATE_EVENT_TOKEN,
    });
    process.env.CASE_NUMBER = createResponse.data.id;
    caseInfo.id = createResponse.data.id;
    caseInfo.fid = createResponse.data.id.replace(/(.{4})(?=.)/g, '$1-');
    caseInfo.state = createResponse.data.state;
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
