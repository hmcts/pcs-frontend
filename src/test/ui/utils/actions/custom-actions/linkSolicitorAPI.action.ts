import { Page } from '@playwright/test';
// eslint-disable-next-line import/no-named-as-default
import Axios from 'axios';

import { VERY_SHORT_TIMEOUT, actionRetries } from '../../../../../../playwright.config';
import { createCaseEventTokenApiData } from '../../../data/api-data';
import { getCaseApiData } from '../../../data/api-data/getCase.api.data';
import { linkSolicitorTokenApiData } from '../../../data/api-data/linkSolicitorEventToken.api.data';
import { user } from '../../../data/user-data';
import { IAction, actionData, actionRecord } from '../../interfaces';

type DefendantCollectionItem = {
  id?: string;
  value?: {
    firstName?: string;
    lastName?: string;
  };
};

export class LinkSolicitorAPIAction implements IAction {
  async execute(_page: Page, action: string, fieldName?: actionData | actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['linkSolicitorAPI', () => this.linkSolicitorAPI(fieldName as string | undefined)],
      ['linkDefendantToSolicitorForCaseAPI', () => this.linkDefendantToSolicitorForCaseAPI(fieldName as actionRecord)],
    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  private async linkDefendantToSolicitorForCaseAPI(getDetails: actionRecord): Promise<void> {
    const createResponse = await this.getCase();
    if (getDetails.req === 'Claim Submission Time') {
      process.env.Submission_TIME = this.formatDateTimeBST(String(createResponse.data.last_state_modified_on));
      console.log(`\n✅ The claim was submitted on "${process.env.Submission_TIME}"`);
      return;
    }

    const email = this.getRequiredString(getDetails.email, 'email');
    const password = this.getRequiredString(getDetails.password, 'password');

    await this.generateSolicitorAccessToken(email, password);
    const allDefendants = createResponse.data.data.allDefendants as DefendantCollectionItem[];
    const defendantsToLink = this.getDefendantsToLink(allDefendants, getDetails.defendantIndex, createResponse.status);

    for (const defendant of defendantsToLink) {
      process.env.Defendant_ID = defendant.id;
      console.log(
        `Linking solicitor ${email} to defendant ${this.getDefendantName(defendant)} with id ${defendant.id}`
      );

      await this.linkSolicitorAPI(email);
    }
    console.log(`\n✅ GET DEFENDANT ID SUCCESSFUL : STATUS ${createResponse.status}`);
  }

  private async getCase() {
    const getCaseApi = Axios.create(createCaseEventTokenApiData.createCaseApiInstance());
    try {
      return await getCaseApi.get(getCaseApiData.getCaseApiEndPoint());
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

        if (!status) {
          throw new Error('Defendant id not retrieved: no response from server.');
        }
        throw new Error(
          `Retrieving defendant id failed with status ${status}. Response received is ${responseBody?.message}`
        );
      }

      throw new Error('Defendant id not retrieved due to an unexpected error.');
    }
  }

  private getDefendantsToLink(
    allDefendants: DefendantCollectionItem[],
    defendantIndexValue: actionData | undefined,
    responseStatus: number
  ): (DefendantCollectionItem & { id: string })[] {
    if (!Array.isArray(allDefendants) || allDefendants.length === 0) {
      throw new Error(`No Defendants ID retrieved and the status is ${responseStatus}`);
    }

    if (defendantIndexValue !== undefined) {
      const defendantIndex = Number(defendantIndexValue);
      if (!Number.isInteger(defendantIndex)) {
        throw new Error(`Defendant index must be a number. Received ${defendantIndexValue}`);
      }

      const defendant = allDefendants[defendantIndex];
      if (!this.hasDefendantId(defendant)) {
        throw new Error(`No Defendant ID retrieved for index ${defendantIndex} and the status is ${responseStatus}`);
      }

      return [defendant];
    }

    const defendantsWithIds = allDefendants.filter(defendant => this.hasDefendantId(defendant));
    if (defendantsWithIds.length !== allDefendants.length) {
      throw new Error(`No Defendants ID retrieved and the status is ${responseStatus}`);
    }

    return defendantsWithIds;
  }

  private async linkSolicitorAPI(email: string = user.defendantSolicitor.email): Promise<void> {
    const linkSolicitorApi = Axios.create(linkSolicitorTokenApiData.linkSolicitorTokenApiInstance());

    const maxRetries = actionRetries;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await linkSolicitorApi.post(linkSolicitorTokenApiData.linkSolicitorApiEndPoint());

        console.log(`\n✅ LINK SOLICITOR TO DEFENDANT:`);
        console.log(`Successfully Linked Solicitor: ${email} with Defendant with id ${process.env.Defendant_ID}`);
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

          if (status === 404) {
            throw error;
          }

          if (attempt === maxRetries) {
            throw error;
          }

          console.warn(`⚠️ Retry attempt ${attempt} failed. Retrying...`);

          await new Promise(res => setTimeout(res, VERY_SHORT_TIMEOUT));
          continue;
        }

        if (attempt === maxRetries) {
          throw new Error('Linking Solicitor failed due to an unexpected error.');
        }

        console.warn(`⚠️ Retry attempt ${attempt} failed. Retrying...`);

        await new Promise(res => setTimeout(res, VERY_SHORT_TIMEOUT));
      }
    }
  }

  private async generateSolicitorAccessToken(username: string, password: string): Promise<void> {
    const { IdamUtils } = await import('@hmcts/playwright-common');
    process.env.SOLICITOR_ACCESS_TOKEN = await new IdamUtils().generateIdamToken({
      username,
      password,
      grantType: 'password',
      clientId: 'pcs-api',
      clientSecret: process.env.PCS_API_IDAM_SECRET as string,
      scope: 'profile openid roles',
    });
  }

  private formatDateTimeBST(dateTime: string): string {
    return new Date(dateTime).toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  private getRequiredString(value: actionData | undefined, fieldName: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`${fieldName} is required to link defendant to solicitor`);
    }

    return value;
  }

  private getDefendantName(defendant: DefendantCollectionItem): string {
    return `${defendant.value?.firstName ?? ''} ${defendant.value?.lastName ?? ''}`.trim();
  }

  private hasDefendantId(
    defendant: DefendantCollectionItem | undefined
  ): defendant is DefendantCollectionItem & { id: string } {
    return typeof defendant?.id === 'string' && defendant.id.trim() !== '';
  }
}
