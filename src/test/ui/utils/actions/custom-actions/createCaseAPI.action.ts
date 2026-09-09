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
import { paymentApiData } from '../../../data/api-data/payment.api.data';
import { user } from '../../../data/user-data';
import { logApiFailure, pollApi } from '../../common/apiRetry.utils';
import { performAction } from '../../controller';
import { IAction, actionData, actionRecord } from '../../interfaces';

export class CreateCaseAPIAction implements IAction {
  async execute(page: Page, action: string, fieldName: actionData | actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['createCaseAPI', () => this.createCaseAPI(fieldName)],
      ['submitCaseAPI', () => this.submitCaseAPI(fieldName)],
      ['updatePaymentAPI', () => this.updatePaymentAPI()],
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
    const createCasePayloadData = typeof caseData === 'object' && 'data' in caseData ? caseData.data : caseData;

    const createResponse = await pollApi(
      async () => {
        const tokenResponse = await createCaseApi.get(createCaseEventTokenApiData.createCaseEventTokenApiEndPoint);
        return createCaseApi.post(createCaseApiData.createCaseApiEndPoint, {
          data: createCasePayloadData,
          event: { id: createCaseApiData.createCaseEventName },
          event_token: tokenResponse.data.token,
        });
      },
      {
        description: `POST ${createCaseApiData.createCaseApiEndPoint} (create case)`,
        isReady: response => response.status === 200 || response.status === 201,
        describeNotReady: response => `Last observed status: ${response?.status ?? 'UNKNOWN'}`,
        maxAttempts: actionRetries,
      }
    );

    const caseId = String(createResponse.data.id);
    process.env.CASE_NUMBER = caseId;
    process.env.CASE_FID = caseId.replace(/(.{4})(?=.)/g, '$1 ');
  }

  private async getCaseAPI(): Promise<void> {
    const getCaseApi = Axios.create(createCaseEventTokenApiData.createCaseApiInstance());

    //process.env.CREATE_EVENT_TOKEN = (await getCaseApi.get(createCaseEventTokenApiData.createCaseEventTokenApiEndPoint)).data.token;
    try {
      const createResponse = await pollApi(() => getCaseApi.get(getCaseApiData.getCaseApiEndPoint()), {
        description: `GET ${getCaseApiData.getCaseApiEndPoint()} (read case)`,
        maxAttempts: actionRetries,
      });
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
        logApiFailure('getCaseAPI', error);
        throw error;
      }

      throw error instanceof Error
        ? error
        : new Error(`Defendant id not retrieved due to an unexpected error: ${String(error)}`);
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
    const submitCasePayloadData = typeof caseData === 'object' && 'data' in caseData ? caseData.data : caseData;

    await pollApi(
      async () => {
        const tokenResponse = await submitCaseApi.get(submitCaseEventTokenApiData.submitCaseEventTokenApiEndPoint());
        return submitCaseApi.post(submitCaseApiData.submitCaseApiEndPoint(), {
          data: submitCasePayloadData,
          event: { id: submitCaseApiData.submitCaseEventName },
          event_token: tokenResponse.data.token,
        });
      },
      {
        description: `POST ${submitCaseApiData.submitCaseApiEndPoint()} (submit case)`,
        isReady: response => response.status === 200 || response.status === 201,
        describeNotReady: response => `Last observed status: ${response?.status ?? 'UNKNOWN'}`,
        maxAttempts: actionRetries,
      }
    );
  }

  private async updatePaymentAPI(): Promise<void> {
    const paymentApi = Axios.create(paymentApiData.paymentApiInstance());
    const maxRetries = actionRetries;
    const delayMs = VERY_SHORT_TIMEOUT;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await paymentApi.get(paymentApiData.getFeePaymentInfoApiEndPoint());
        const paymentInfo = response.data;
        if (!paymentInfo?.length) {
          throw new Error('No payment information found.');
        }
        const requestReference = paymentInfo[0].serviceRequestReference;
        const updateResponse = await paymentApi.put(
          paymentApiData.updatePaymentApiEndPoint,
          paymentApiData.paymentUpdatePayload(requestReference)
        );
        if (updateResponse.status === 200 || updateResponse.status === 204) {
          return;
        }
        throw new Error(`Payment update failed with status ${updateResponse.status}`);
      } catch (error: unknown) {
        if (attempt === maxRetries) {
          if (Axios.isAxiosError(error)) {
            throw new Error(`Payment API failed after retries: ${error.response?.status}`);
          }
          throw new Error('Payment API failed unexpectedly after retries.');
        }
        await new Promise(res => setTimeout(res, delayMs));
      }
    }
    throw new Error('Payment API failed after multiple retries');
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
