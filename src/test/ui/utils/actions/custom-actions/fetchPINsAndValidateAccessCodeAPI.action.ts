import { Page } from '@playwright/test';
// eslint-disable-next-line import/no-named-as-default
import Axios from 'axios';

import { VERY_SHORT_TIMEOUT, actionRetries } from '../../../../../../playwright.config';
import { fetchPINsApiData, validateAccessCodeApiData } from '../../../data/api-data';
import { IAction } from '../../interfaces';

export type PinUser = {
  pin: string;
  firstName: string;
  lastName: string;
  address: string;
  [k: string]: any;
};

export let pins: string[] = [];
export let firstName: string = '';
export let lastName: string = '';
export let address: string = '';
export let pinUsers: PinUser[] = [];
export let selectedPinUser: PinUser | undefined;

function hasKnownDefendantDetails(pinUser: PinUser): boolean {
  return Boolean(pinUser.firstName && pinUser.lastName);
}

function setSelectedPinUser(pinUser: PinUser | undefined): PinUser | undefined {
  selectedPinUser = pinUser;
  firstName = pinUser?.firstName ?? '';
  lastName = pinUser?.lastName ?? '';
  address = pinUser?.address ?? '';
  return selectedPinUser;
}

export function getSelectedPinUser(): PinUser | undefined {
  return selectedPinUser;
}

export function selectPinUserByDefendantDetails(detailsKnown: boolean): PinUser | undefined {
  const matchingPinUser = pinUsers.find(pinUser => hasKnownDefendantDetails(pinUser) === detailsKnown) ?? pinUsers[0];
  return setSelectedPinUser(matchingPinUser);
}

export async function getPinUserAt(index: number, timeoutMs = 5000): Promise<PinUser> {
  const pollInterval = 200;
  const start = Date.now();
  while (pinUsers.length <= index && Date.now() - start < timeoutMs) {
    await new Promise(res => setTimeout(res, pollInterval));
  }
  if (pinUsers.length <= index) {
    throw new Error(`Expected pinUsers[${index}] to be populated within ${timeoutMs}ms but found ${pinUsers.length}`);
  }
  return pinUsers[index] as PinUser;
}

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
        pinUsers = pins.map(pin => {
          const pinData = response.data[pin];
          const addressObj = pinData.address;
          let formattedAddress = '';
          if (addressObj) {
            const { AddressLine1, AddressLine2, AddressLine3, PostTown, County, PostCode, Country } = addressObj;
            formattedAddress = [AddressLine1, AddressLine2, AddressLine3, PostTown, County, PostCode, Country]
              .filter(value => value && typeof value === 'string' && value.trim() !== '')
              .join(', ');
          }
          return {
            pin,
            firstName: pinData.firstName,
            lastName: pinData.lastName,
            address: formattedAddress,
          };
        });
        setSelectedPinUser(pinUsers[0]);
        return;
      }
      await new Promise(res => setTimeout(res, delayMs));
    }
    throw new Error('PINs were not generated after multiple retries');
  }

  private async validateAccessCodeAPI(): Promise<void> {
    const validateApi = Axios.create(validateAccessCodeApiData.validateAccessCodeApiInstance());
    const unknownPinUser = pinUsers.find((u: PinUser) => {
      const missingName = !u.firstName || !u.lastName;
      const missingAddress = !u.address || (typeof u.address === 'string' && u.address.trim() === '');
      return missingName || missingAddress;
    });

    if (unknownPinUser && unknownPinUser.pin) {
      process.env.VALIDATE_ACCESS_CODE = unknownPinUser.pin;
      console.info(`Using unknown defendant PIN: ${unknownPinUser.pin}`);
    }

    const accessCode =
      process.env.VALIDATE_ACCESS_CODE && process.env.VALIDATE_ACCESS_CODE !== ''
        ? process.env.VALIDATE_ACCESS_CODE
        : pins?.[0];

    if (!accessCode) {
      throw new Error('No access code available for validation');
    }
    const maxRetries = actionRetries;
    const delayMs = VERY_SHORT_TIMEOUT;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await validateApi.post(validateAccessCodeApiData.validateAccessCodeApiEndPoint(), {
          accessCode,
        });
        if (response.status === 200) {
          return;
        }
      } catch (error: unknown) {
        if (attempt === maxRetries) {
          if (Axios.isAxiosError(error)) {
            throw new Error(`Validate access code failed after retries: ${error.response?.status}`);
          }
          throw new Error('Validate access code failed unexpectedly after retries.');
        }
      }
      await new Promise(res => setTimeout(res, delayMs));
    }
    throw new Error('Validate access code API failed after multiple retries');
  }
}
