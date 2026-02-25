import { Page } from '@playwright/test';
// eslint-disable-next-line import/no-named-as-default
import Axios from 'axios';

import { VERY_SHORT_TIMEOUT, actionRetries } from '../../../../../../playwright.config';
import { fetchPINsApiData, validateAccessCodeApiData } from '../../../data/api-data';
import { IAction } from '../../interfaces';

export let pins: string[] = [];
export let firstName: string = '';
export let lastName: string = '';

export class FetchPINsAndValidateAccessCodeAPIAction implements IAction {
  async execute(page: Page, action: string): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['fetchPINsAPI', () => this.fetchPINsAPI()],
      ['validateAccessCodeAPI', () => this.validateAccessCodeAPI()],
    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  private async fetchPINsAPI(): Promise<void> {
    const fetchPinsApi = Axios.create(fetchPINsApiData.fetchPINSApiInstance());
    const maxRetries = actionRetries;
    const delayMs = VERY_SHORT_TIMEOUT;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const response = await fetchPinsApi.get(fetchPINsApiData.fetchPINsApiEndPoint());
      const fetchedPins = Object.keys(response.data);
      if (fetchedPins.length > 0) {
        pins = fetchedPins;
        const pinData = response.data[pins[0]];
        firstName = pinData.firstName;
        lastName = pinData.lastName;
        return;
      }
      await new Promise(res => setTimeout(res, delayMs));
    }
    throw new Error('PINs were not generated after multiple retries');
  }

  private async validateAccessCodeAPI(): Promise<void> {
    const validateApi = Axios.create(validateAccessCodeApiData.validateAccessCodeApiInstance());
    const accessCode = pins?.[0];
    if (!accessCode) {
      throw new Error('No access code available for validation');
    }
    try {
      await validateApi.post(validateAccessCodeApiData.validateAccessCodeApiEndPoint(), {
        accessCode,
      });
    } catch (error: unknown) {
      if (Axios.isAxiosError(error)) {
        throw new Error(`Validate access code failed: ${error.response?.status}`);
      }
      throw new Error('Validate access code failed unexpectedly.');
    }
  }
}
