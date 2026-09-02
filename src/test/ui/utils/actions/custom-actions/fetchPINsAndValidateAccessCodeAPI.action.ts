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

const INITIAL_BACKOFF_MS = 200;
const MAX_BACKOFF_MS = 2000;

type Poller = {
  readonly maxAttempts: number;
  waitBeforeRetry(attempt: number, reason?: string): Promise<void>;
  logIfSlow(attempt: number): void;
};

/**
 * Builds an exponentially growing (capped) list of retry delays.
 * The schedule keeps growing until it covers `totalBudgetMs` of waiting AND provides at least
 * `minDelays` retries, so overall tolerance for a slow backend is never below the flat-delay
 * behaviour it replaces - it is just front-loaded so a fast backend is not made to wait a full tick.
 */
function buildBackoffSchedule(totalBudgetMs: number, minDelays: number): number[] {
  const delays: number[] = [];
  let scheduled = 0;
  let delay = INITIAL_BACKOFF_MS;
  while (scheduled < totalBudgetMs || delays.length < minDelays) {
    delays.push(delay);
    scheduled += delay;
    delay = Math.min(delay * 2, MAX_BACKOFF_MS);
  }
  return delays;
}

/**
 * Condition-based poller: exponential backoff plus attempt/elapsed logging so a slow
 * backend shows up in the Jenkins console instead of being silently absorbed.
 */
function createPoller(label: string, totalBudgetMs: number, minAttempts: number): Poller {
  const delays = buildBackoffSchedule(totalBudgetMs, Math.max(minAttempts - 1, 0));
  const startedAt = Date.now();
  return {
    maxAttempts: delays.length + 1,
    async waitBeforeRetry(attempt: number, reason?: string): Promise<void> {
      const delayMs = delays[attempt - 1] ?? MAX_BACKOFF_MS;
      const suffix = reason ? ` (${reason})` : '';
      console.info(
        `[poll] ${label}: attempt ${attempt}/${delays.length + 1} unsuccessful after ${Date.now() - startedAt}ms${suffix}, retrying in ${delayMs}ms`
      );
      await new Promise(res => setTimeout(res, delayMs));
    },
    logIfSlow(attempt: number): void {
      if (attempt > 1) {
        console.info(`[poll] ${label}: succeeded on attempt ${attempt} after ${Date.now() - startedAt}ms`);
      }
    },
  };
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

async function waitUntilCaseIssued(): Promise<void> {
  const getCaseApi = Axios.create(createCaseEventTokenApiData.createCaseApiInstance());
  const poller = createPoller('waitUntilCaseIssued', (actionRetries - 1) * SHORT_TIMEOUT, actionRetries);
  const maxRetries = poller.maxAttempts;
  let caseStatus = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await getCaseApi.get(getCaseApiData.getCaseApiEndPoint());
    caseStatus = String(response?.data?.state).trim().toUpperCase();

    if (caseStatus === 'CASE_ISSUED') {
      poller.logIfSlow(attempt);
      return;
    }

    if (attempt === maxRetries) {
      throw new Error(`Case is not ISSUED. Last observed status: ${caseStatus || 'UNKNOWN'}`);
    }

    await poller.waitBeforeRetry(attempt, `state=${caseStatus || 'UNKNOWN'}`);
  }
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

    const poller = createPoller('fetchPINsAPI', (actionRetries - 1) * SHORT_TIMEOUT, actionRetries);
    const maxRetries = poller.maxAttempts;
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
        poller.logIfSlow(attempt);
        return;
      }
      if (attempt < maxRetries) {
        await poller.waitBeforeRetry(attempt, 'no PINs yet');
      }
    }
    throw new Error('PINs were not generated after multiple retries once case reached CASE_ISSUED');
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
    const poller = createPoller('validateAccessCodeAPI', (actionRetries - 1) * VERY_SHORT_TIMEOUT, actionRetries);
    const maxRetries = poller.maxAttempts;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let failureReason = 'non-200 response';
      try {
        const response = await validateApi.post(validateAccessCodeApiData.validateAccessCodeApiEndPoint(), {
          accessCode,
        });
        if (response.status === 200) {
          poller.logIfSlow(attempt);
          return;
        }
        failureReason = `status=${response.status}`;
      } catch (error: unknown) {
        if (attempt === maxRetries) {
          if (Axios.isAxiosError(error)) {
            throw error;
          }
          throw new Error('Validate access code failed unexpectedly after retries.');
        }
        failureReason = error instanceof Error ? error.message : 'request failed';
      }
      if (attempt < maxRetries) {
        await poller.waitBeforeRetry(attempt, failureReason);
      }
    }
    throw new Error('Validate access code API failed after multiple retries');
  }
}
