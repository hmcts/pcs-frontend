import { Page } from '@playwright/test';
// eslint-disable-next-line import/no-named-as-default
import Axios from 'axios';

import { SHORT_TIMEOUT, VERY_SHORT_TIMEOUT, actionRetries } from '../../../../../../playwright.config';
import {
  createCaseEventTokenApiData,
  fetchPINsApiData,
  submitCaseApiData,
  validateAccessCodeApiData,
} from '../../../data/api-data';
import { getCaseApiData } from '../../../data/api-data/getCase.api.data';
import { pollApi } from '../../common/apiRetry.utils';
import { IAction } from '../../interfaces';

export type PinUser = {
  pin: string;
  nameKnown?: boolean;
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
  return pinUser.nameKnown ?? Boolean(pinUser.firstName || pinUser.lastName);
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

export const getSelectedDefendantNumber = (): number => {
  const selectedUser = getSelectedPinUser();
  if (!selectedUser) {
    throw new Error('No selected PIN user available');
  }
  const payload = submitCaseApiData.submitCasePayload;
  const defendants = [payload.defendant1, ...(payload.additionalDefendants ?? []).map(defendant => defendant.value)];
  const defendantIndex = defendants.findIndex(
    defendant => defendant.firstName === selectedUser.firstName && defendant.lastName === selectedUser.lastName
  );
  if (defendantIndex === -1) {
    throw new Error(
      `Could not find selected defendant ${selectedUser.firstName} ${selectedUser.lastName} in submitCasePayload`
    );
  }
  return defendantIndex + 1;
};

export function selectPinUserByDefendantDetails(detailsKnown: boolean): PinUser | undefined {
  const matchingPinUser = pinUsers.find(pinUser => hasKnownDefendantDetails(pinUser) === detailsKnown) ?? pinUsers[0];
  return setSelectedPinUser(matchingPinUser);
}

export function selectPinUserByIndex(index: number): PinUser | undefined {
  return setSelectedPinUser(pinUsers[index]);
}

export function selectPinUserByName(firstNameValue: string, lastNameValue: string): PinUser | undefined {
  const matchingPinUser = pinUsers.find(
    pinUser =>
      pinUser.firstName?.trim().toLowerCase() === firstNameValue.trim().toLowerCase() &&
      pinUser.lastName?.trim().toLowerCase() === lastNameValue.trim().toLowerCase()
  );
  return setSelectedPinUser(matchingPinUser);
}

function getDefaultPinUser(): PinUser | undefined {
  const hasUnknownDefendant = pinUsers.some(pinUser => !hasKnownDefendantDetails(pinUser));
  return hasUnknownDefendant ? selectPinUserByDefendantDetails(false) : setSelectedPinUser(pinUsers[0]);
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

function readCaseState(response: { data?: { state?: unknown } } | undefined): string {
  return String(response?.data?.state ?? '')
    .trim()
    .toUpperCase();
}

async function waitUntilCaseIssued(): Promise<void> {
  const getCaseApi = Axios.create(createCaseEventTokenApiData.createCaseApiInstance());

  await pollApi(() => getCaseApi.get(getCaseApiData.getCaseApiEndPoint()), {
    description: `GET ${getCaseApiData.getCaseApiEndPoint()} (wait for CASE_ISSUED)`,
    isReady: response => readCaseState(response) === 'CASE_ISSUED',
    describeNotReady: response => `Case is not ISSUED. Last observed status: ${readCaseState(response) || 'UNKNOWN'}`,
    maxAttempts: actionRetries,
    initialDelayMs: SHORT_TIMEOUT,
    maxDelayMs: SHORT_TIMEOUT,
  });
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
    await waitUntilCaseIssued();

    const response = await pollApi(() => fetchPinsApi.get(fetchPINsApiData.fetchPINsApiEndPoint()), {
      description: `GET ${fetchPINsApiData.fetchPINsApiEndPoint()} (fetch PINs)`,
      isReady: pinsResponse => Object.keys(pinsResponse.data ?? {}).length > 0,
      describeNotReady: () => 'PINs were not generated once case reached CASE_ISSUED.',
      maxAttempts: actionRetries,
      initialDelayMs: SHORT_TIMEOUT,
      maxDelayMs: SHORT_TIMEOUT,
    });

    pins = Object.keys(response.data);
    pinUsers = pins.map(pin => {
      const pinData = response.data[pin];
      const addressObj = pinData.address;
      let formattedAddress = '';
      if (addressObj) {
        const { AddressLine1, AddressLine2, AddressLine3, PostTown, County, PostCode } = addressObj;
        formattedAddress = [AddressLine1, AddressLine2, AddressLine3, PostTown, County, PostCode]
          .filter(value => value && typeof value === 'string' && value.trim() !== '')
          .join(', ');
      }
      return {
        pin,
        nameKnown:
          typeof pinData.nameKnown === 'string'
            ? pinData.nameKnown === 'YES'
            : Boolean(pinData.firstName || pinData.lastName),
        firstName: pinData.firstName,
        lastName: pinData.lastName,
        address: formattedAddress,
      };
    });
    getDefaultPinUser();
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
    await pollApi(() => validateApi.post(validateAccessCodeApiData.validateAccessCodeApiEndPoint(), { accessCode }), {
      description: `POST ${validateAccessCodeApiData.validateAccessCodeApiEndPoint()} (validate access code)`,
      isReady: response => response.status === 200,
      describeNotReady: response => `Last observed status: ${response?.status ?? 'UNKNOWN'}`,
      maxAttempts: actionRetries,
      initialDelayMs: VERY_SHORT_TIMEOUT,
    });
  }
}
