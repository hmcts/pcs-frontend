import { Page } from '@playwright/test';
// eslint-disable-next-line import/no-named-as-default
import Axios from 'axios';

import { VERY_SHORT_TIMEOUT, actionRetries } from '../../../../../../playwright.config';
import {
  caseUserRoleDeletionApiData,
  createCaseApiData,
  createCaseEventTokenApiData,
  submitCaseApiData,
  submitCaseEventTokenApiData,
} from '../../../data/api-data';
import { getCaseApiData } from '../../../data/api-data/getCase.api.data';
import { user } from '../../../data/user-data';
import { performAction } from '../../controller';
import { IAction, actionData, actionRecord } from '../../interfaces';

export class CreateCaseAPIAction implements IAction {
  async execute(page: Page, action: string, fieldName: actionData | actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['createCaseAPI', () => this.createCaseAPI(fieldName)],
      ['submitCaseAPI', () => this.submitCaseAPI(fieldName)],
      ['deleteCaseRole', () => this.deleteCaseRole(fieldName)],
      ['getCaseAPI', () => this.getCaseAPI()],
    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  private async createCaseAPI(caseData: actionData): Promise<void> {
    const createCaseApi = Axios.create(createCaseEventTokenApiData.createCaseApiInstance());
    const maxRetries = actionRetries;
    const delayMs = VERY_SHORT_TIMEOUT;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const tokenResponse = await createCaseApi.get(createCaseEventTokenApiData.createCaseEventTokenApiEndPoint);
        if (tokenResponse.status !== 200) {
          throw new Error('Failed to get create case token');
        }
        const CREATE_EVENT_TOKEN = tokenResponse.data.token;
        const createCasePayloadData = typeof caseData === 'object' && 'data' in caseData ? caseData.data : caseData;
        const createResponse = await createCaseApi.post(createCaseApiData.createCaseApiEndPoint, {
          data: createCasePayloadData,
          event: { id: createCaseApiData.createCaseEventName },
          event_token: CREATE_EVENT_TOKEN,
        });
        if (createResponse.status === 200 || createResponse.status === 201) {
          process.env.CASE_NUMBER = createResponse.data.id;
          process.env.CASE_FID = createResponse.data.id.replace(/(.{4})(?=.)/g, '$1 ');
          return;
        }
      } catch (error: unknown) {
        if (attempt === maxRetries) {
          if (Axios.isAxiosError(error)) {
            throw error;
          }
          throw new Error('Create case failed unexpectedly.');
        }
      }
      await new Promise(res => setTimeout(res, delayMs));
    }
    throw new Error('Create case API failed after multiple retries');
  }

  private async getCaseAPI(): Promise<void> {
    const getCaseApi = Axios.create(createCaseEventTokenApiData.createCaseApiInstance());

    //process.env.CREATE_EVENT_TOKEN = (await getCaseApi.get(createCaseEventTokenApiData.createCaseEventTokenApiEndPoint)).data.token;
    try {
      const createResponse = await getCaseApi.get(getCaseApiData.getCaseApiEndPoint());
      await this.generateSolicitorAccessToken();
      const allDefendants = createResponse.data.data.allDefendants;
      const defendantIds = allDefendants.map((d: any) => d.id);
      if (defendantIds.length === 0) {
        throw new Error(`No Defendants ID retrieved and the status is ${createResponse.status}`);
      }

      for (const defendantId of defendantIds) {
        process.env.Defendant_ID = defendantId;

        await performAction('linkSolicitorAPI');
      }
      console.log(`\n✅ GET DEFENDANT ID SUCCESSFUL : STATUS ${createResponse.status}`);
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
        console.error('Full response body:', JSON.stringify(responseBody, null, 2));

        throw error;
      }

      throw new Error('Defendant id not retrieved due to an unexpected error.');
    }
  }

  private async generateSolicitorAccessToken(): Promise<void> {
    const { IdamUtils } = await import('@hmcts/playwright-common');
    process.env.SOLICITOR_ACCESS_TOKEN = await new IdamUtils().generateIdamToken({
      username: user.defendantSolicitor.email,
      password: user.defendantSolicitor.password,
      grantType: 'password',
      clientId: 'pcs-api',
      clientSecret: process.env.PCS_API_IDAM_SECRET as string,
      scope: 'profile openid roles',
    });
  }

  private async submitCaseAPI(caseData: actionData): Promise<void> {
    const submitCaseApi = Axios.create(submitCaseEventTokenApiData.createCaseApiInstance());
    const maxRetries = actionRetries;
    const delayMs = VERY_SHORT_TIMEOUT;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const tokenResponse = await submitCaseApi.get(submitCaseEventTokenApiData.submitCaseEventTokenApiEndPoint());
        if (tokenResponse.status !== 200) {
          throw new Error('Failed to get submit token');
        }
        const SUBMIT_EVENT_TOKEN = tokenResponse.data.token;
        const submitCasePayloadData = typeof caseData === 'object' && 'data' in caseData ? caseData.data : caseData;
        const response = await submitCaseApi.post(submitCaseApiData.submitCaseApiEndPoint(), {
          data: submitCasePayloadData,
          event: { id: submitCaseApiData.submitCaseEventName },
          event_token: SUBMIT_EVENT_TOKEN,
        });
        if (response.status === 200 || response.status === 201) {
          return;
        }
      } catch (error: unknown) {
        if (attempt === maxRetries) {
          if (Axios.isAxiosError(error)) {
            throw error;
          }
          throw new Error('Submit case failed unexpectedly.');
        }
      }
      await new Promise(res => setTimeout(res, delayMs));
    }
    throw new Error('Submit case API failed after multiple retries');
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
