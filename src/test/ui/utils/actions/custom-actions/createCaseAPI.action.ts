import { Page } from '@playwright/test';
// eslint-disable-next-line import/no-named-as-default
import Axios from 'axios';

import {
  caseUserRoleDeletionApiData,
  createCaseApiData,
  createCaseEventTokenApiData,
  submitCaseApiData,
  submitCaseEventTokenApiData,
} from '../../../data/api-data';
import { user } from '../../../data/user-data';
import { IAction, actionData, actionRecord } from '../../interfaces';

export class CreateCaseAPIAction implements IAction {
  async execute(page: Page, action: string, fieldName: actionData | actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['createCaseAPI', () => this.createCaseAPI(fieldName)],
      ['submitCaseAPI', () => this.submitCaseAPI(fieldName)],
      ['deleteCaseRole', () => this.deleteCaseRole(fieldName)],
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
    process.env.CASE_FID = createResponse.data.id.replace(/(.{4})(?=.)/g, '$1 ');
  }

  private async submitCaseAPI(caseData: actionData): Promise<void> {
    const submitCaseApi = Axios.create(submitCaseEventTokenApiData.createCaseApiInstance());
    const SUBMIT_EVENT_TOKEN = (await submitCaseApi.get(submitCaseEventTokenApiData.submitCaseEventTokenApiEndPoint()))
      .data.token;
    const submitCasePayloadData = typeof caseData === 'object' && 'data' in caseData ? caseData.data : caseData;
    try {
      await submitCaseApi.post(submitCaseApiData.submitCaseApiEndPoint(), {
        data: submitCasePayloadData,
        event: { id: submitCaseApiData.submitCaseEventName },
        event_token: SUBMIT_EVENT_TOKEN,
      });
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

  private async deleteCaseRole(roleData: actionData): Promise<void> {
    const userId = user.claimantSolicitor.uid;
    const caseId = (process.env.CASE_NUMBER ?? '').replace(/-/g, '');
    const caseRole = typeof roleData === 'string' ? roleData : String(roleData);
    if (!caseId) {
      console.warn('No case ID available for case user removal.');
      return;
    }
    if (!userId) {
      console.warn('No user ID available for case user removal.');
      return;
    }
    const deleteCaseUsersApi = Axios.create(caseUserRoleDeletionApiData.deleteCaseUsersApiInstance());
    try {
      const payload = caseUserRoleDeletionApiData.deleteCaseUsersPayload(caseId, userId, caseRole);
      await deleteCaseUsersApi.delete(caseUserRoleDeletionApiData.deleteCaseUsersApiEndPoint, { data: payload });
      console.log(`\n✅ CASE USER CLEANUP:`);
      console.log(`   Successfully removed case user with role ${caseRole}`);
    } catch (error: unknown) {
      const status = Axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 404) {
        console.warn('Case user removal failed: case or user not found (404).');
      } else if (status === 403) {
        console.warn('Case user removal failed: insufficient permissions (403).');
      } else if (!status) {
        console.warn('Case user removal failed: no response from server.');
      } else {
        console.warn(`Case user removal failed with status ${status}.`);
      }
    }
  }
}
