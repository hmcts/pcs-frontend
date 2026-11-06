import { DateTime } from 'luxon';

import { CcdCaseData, CcdCollectionItem, CcdParty } from '@services/ccdCase.interface';

export enum WarrantReturnType {
  FINAL = 'FINAL',
  INTERIM = 'INTERIM',
}

export enum InterimReturnName {
  APPLICATION_UNSUCCESSFUL = 'APPLICATION_UNSUCCESSFUL',
  ADDITIONAL_INFORMATION_REQUEST = 'ADDITIONAL_INFORMATION_REQUEST',
  NO_ANIMAL_HANDLER = 'NO_ANIMAL_HANDLER',
  NO_POLICE_PRESENCE = 'NO_POLICE_PRESENCE',
  CHILDREN_UNATTENDED = 'CHILDREN_UNATTENDED',
  CROWDS_OR_PROTESTS = 'CROWDS_OR_PROTESTS',
  OBSTRUCTION_BY_DEFENDANTS = 'OBSTRUCTION_BY_DEFENDANTS',
  SAFEGUARDING_OR_VULNERABILITY_CONCERNS = 'SAFEGUARDING_OR_VULNERABILITY_CONCERNS',
  DEFENDANT_STATES_IN_BREATHING_SPACE = 'DEFENDANT_STATES_IN_BREATHING_SPACE',
  CLAIMANT_ADVISED_DEFENDANT_BREATHING_SPACE = 'CLAIMANT_ADVISED_DEFENDANT_BREATHING_SPACE',
  OTHER_INTERIM_RETURN = 'OTHER_INTERIM_RETURN',
  REOPEN_WARRANT = 'REOPEN_WARRANT',
}

export enum EvictionOutcome {
  SUCCESSFUL = 'SUCCESSFUL',
  UNSUCCESSFUL = 'UNSUCCESSFUL',
  CANCELLED = 'CANCELLED',
}

export enum EvictionSuccessfulReturnName {
  EVICTION_SUCCESSFUL = 'EVICTION_SUCCESSFUL',
}

export enum EvictionUnsuccessfulReturnName {
  WARRANT_WITHDRAWN = 'WARRANT_WITHDRAWN',
  WARRANT_SUSPENDED = 'WARRANT_SUSPENDED',
  POSSESSION_ORDER_SET_ASIDE = 'POSSESSION_ORDER_SET_ASIDE',
  UNABLE_TO_GAIN_ACCESS = 'UNABLE_TO_GAIN_ACCESS',
  EVICTION_NOT_CONFIRMED = 'EVICTION_NOT_CONFIRMED',
  NO_LOCKSMITH = 'NO_LOCKSMITH',
  NO_ANIMAL_HANDLER = 'NO_ANIMAL_HANDLER',
  NO_CLAIMANT_OR_AGENT = 'NO_CLAIMANT_OR_AGENT',
  NO_REPLY_TO_ADDITIONAL_INFORMATION_REQUEST = 'NO_REPLY_TO_ADDITIONAL_INFORMATION_REQUEST',
  EVICTION_UNSUCCESSFUL_OTHER = 'EVICTION_UNSUCCESSFUL_OTHER',
  WARRANT_EXPIRED = 'WARRANT_EXPIRED',
  WARRANT_ISSUED_IN_ERROR = 'WARRANT_ISSUED_IN_ERROR',
}

export interface WarrantReturn {
  returnType: WarrantReturnType;
  returnName?: InterimReturnName | EvictionSuccessfulReturnName | EvictionUnsuccessfulReturnName;
  outcome?: EvictionOutcome;
  additionalDetails?: string;
  evictionDate?: DateTime;
}

export interface EvictionSummaryData {
  rows: {
    key: {
      text: string;
    };
    value: {
      text: string;
    };
  }[];
}

export const warrantReturnTypeList: { value: WarrantReturnType | string; text: string }[] = [
  { value: '', text: '--Select a value--' },
  { value: WarrantReturnType.FINAL, text: 'Final' },
  { value: WarrantReturnType.INTERIM, text: 'Interim' },
];

export const evictionOutcomeList: { value: EvictionOutcome | string; text: string }[] = [
  { value: '', text: '--Select a value--' },
  { value: EvictionOutcome.SUCCESSFUL, text: 'Eviction successful' },
  { value: EvictionOutcome.UNSUCCESSFUL, text: 'Eviction unsuccessful' },
  { value: EvictionOutcome.CANCELLED, text: 'Eviction cancelled' },
];

export const evictionSuccessfulReturnTypeList: { value: EvictionSuccessfulReturnName | string; text: string }[] = [
  { value: '', text: '--Select a value--' },
  { value: EvictionSuccessfulReturnName.EVICTION_SUCCESSFUL, text: 'Eviction successful' },
];

export const evictionUnsuccessfulReturnTypeList: { value: EvictionUnsuccessfulReturnName | string; text: string }[] = [
  {
    value: '',
    text: '--Select a value--',
  },
  {
    value: EvictionUnsuccessfulReturnName.WARRANT_WITHDRAWN,
    text: 'Warrant withdrawn',
  },
  {
    value: EvictionUnsuccessfulReturnName.WARRANT_SUSPENDED,
    text: 'Warrant suspended by Order',
  },
  {
    value: EvictionUnsuccessfulReturnName.POSSESSION_ORDER_SET_ASIDE,
    text: 'Possession Order set aside',
  },
  {
    value: EvictionUnsuccessfulReturnName.UNABLE_TO_GAIN_ACCESS,
    text: 'Unable to gain access to the property',
  },
  {
    value: EvictionUnsuccessfulReturnName.EVICTION_NOT_CONFIRMED,
    text: 'Claimant did not confirm eviction',
  },
  {
    value: EvictionUnsuccessfulReturnName.NO_LOCKSMITH,
    text: 'No locksmith in attendance (Claimant failed to arrange)',
  },
  {
    value: EvictionUnsuccessfulReturnName.NO_ANIMAL_HANDLER,
    text: 'No animal handler in attendance (Claimant failed to arrange)',
  },
  {
    value: EvictionUnsuccessfulReturnName.NO_CLAIMANT_OR_AGENT,
    text: 'No Claimant or agent in attendance for eviction',
  },
  {
    value: EvictionUnsuccessfulReturnName.NO_REPLY_TO_ADDITIONAL_INFORMATION_REQUEST,
    text: 'No reply to request for additional information',
  },
  {
    value: EvictionUnsuccessfulReturnName.EVICTION_UNSUCCESSFUL_OTHER,
    text: 'Eviction unsuccessful - other',
  },
  {
    value: EvictionUnsuccessfulReturnName.WARRANT_EXPIRED,
    text: 'Warrant expired',
  },
  {
    value: EvictionUnsuccessfulReturnName.WARRANT_ISSUED_IN_ERROR,
    text: 'Warrant issued in error',
  },
];

export const interimReturnTypeList: { value: InterimReturnName | string; text: string }[] = [
  {
    value: '',
    text: '--Select a value--',
  },
  {
    value: InterimReturnName.APPLICATION_UNSUCCESSFUL,
    text: 'Application unsuccessful & warrant returned to bailiff',
  },
  {
    value: InterimReturnName.ADDITIONAL_INFORMATION_REQUEST,
    text: 'Request for additional information',
  },
  {
    value: InterimReturnName.NO_ANIMAL_HANDLER,
    text: 'No animal handler in attendance (Parties unaware of animal)',
  },
  {
    value: InterimReturnName.NO_POLICE_PRESENCE,
    text: 'No Police presence (Police refused to attend when asked to)',
  },
  {
    value: InterimReturnName.CHILDREN_UNATTENDED,
    text: 'Children left unattended in property',
  },
  {
    value: InterimReturnName.CROWDS_OR_PROTESTS,
    text: 'Crowds or protests',
  },
  {
    value: InterimReturnName.OBSTRUCTION_BY_DEFENDANTS,
    text: 'Obstruction by Defendants',
  },
  {
    value: InterimReturnName.SAFEGUARDING_OR_VULNERABILITY_CONCERNS,
    text: 'Safeguarding or vulnerability concerns',
  },
  {
    value: InterimReturnName.DEFENDANT_STATES_IN_BREATHING_SPACE,
    text: 'Defendant states they are in Breathing Space (Standard or Mental Health)',
  },
  {
    value: InterimReturnName.CLAIMANT_ADVISED_DEFENDANT_BREATHING_SPACE,
    text: 'Claimant advised Defendant in Breathing Space',
  },
  {
    value: InterimReturnName.OTHER_INTERIM_RETURN,
    text: 'Other interim return',
  },
  {
    value: InterimReturnName.REOPEN_WARRANT,
    text: 'Reopen warrant',
  },
];

export function formatDefendants(ccdCase: CcdCaseData): string {
  const allDefendants: CcdCollectionItem<CcdParty>[] | undefined = ccdCase.allDefendants;
  let hasUnknownDefendants: boolean = false;

  if (allDefendants === undefined) {
    return '';
  }

  let defendantHtml = '<ul class="govuk-list">';
  for (const defendant of allDefendants) {
    const party: CcdParty = defendant.value;
    if (party.nameKnown) {
      defendantHtml += `<li>${party.firstName} ${party.lastName}</li>`;
    } else {
      hasUnknownDefendants = true;
    }
  }

  if (hasUnknownDefendants) {
    defendantHtml += '<li>person(s) unknown</li>';
  }

  defendantHtml += '</ul>';

  return defendantHtml;
}

export function formatClaimants(ccdCase: CcdCaseData): string {
  const allClaimants: CcdCollectionItem<CcdParty>[] | undefined = ccdCase.allClaimants;
  if (allClaimants === undefined) {
    return '';
  }

  let claimantHtml = '<ul class="govuk-list">';
  for (const defendant of allClaimants) {
    const party: CcdParty = defendant.value;
    if (party.orgName !== undefined) {
      claimantHtml += `<li>${party.orgName}</li>`;
    } else {
      claimantHtml += `<li>${party.firstName} ${party.lastName}</li>`;
    }
  }

  claimantHtml += '</ul>';

  return claimantHtml;
}

export function isAdditionalDetailsMandatoryEvictionUnsuccessful(returnName: EvictionUnsuccessfulReturnName): boolean {
  const mandatoryReturnNames: Set<EvictionUnsuccessfulReturnName> = new Set([
    EvictionUnsuccessfulReturnName.WARRANT_WITHDRAWN,
    EvictionUnsuccessfulReturnName.UNABLE_TO_GAIN_ACCESS,
    EvictionUnsuccessfulReturnName.NO_ANIMAL_HANDLER,
    EvictionUnsuccessfulReturnName.NO_REPLY_TO_ADDITIONAL_INFORMATION_REQUEST,
    EvictionUnsuccessfulReturnName.EVICTION_UNSUCCESSFUL_OTHER,
    EvictionUnsuccessfulReturnName.WARRANT_WITHDRAWN,
  ]);

  return mandatoryReturnNames.has(returnName);
}

export function isAdditionalDetailsMandatoryInterim(returnName: InterimReturnName): boolean {
  const mandatoryReturnNames: Set<InterimReturnName> = new Set([
    InterimReturnName.ADDITIONAL_INFORMATION_REQUEST,
    InterimReturnName.NO_ANIMAL_HANDLER,
    InterimReturnName.SAFEGUARDING_OR_VULNERABILITY_CONCERNS,
    InterimReturnName.OTHER_INTERIM_RETURN,
    InterimReturnName.REOPEN_WARRANT,
  ]);

  return mandatoryReturnNames.has(returnName);
}

export function initWarrantReturn(): void {
  const returnTypeList = document.querySelector<HTMLSelectElement>('#return-type');
  if (!returnTypeList) {
    return;
  }

  returnTypeList.addEventListener('change', _ => {
    handleReturnTypeShowConditions(returnTypeList);
  });

  const finalOutcomeList = document.querySelector<HTMLSelectElement>('#final-outcome');
  finalOutcomeList?.addEventListener('change', _ => {
    handleFinalOutcomeShowConditions(finalOutcomeList);
  });

  const evictionSuccessfulReturnNameList = document.querySelector<HTMLSelectElement>(
    '#eviction-successful-return-name'
  );
  evictionSuccessfulReturnNameList?.addEventListener('change', _ => {
    handleEvictionSuccessfulShowConditions(evictionSuccessfulReturnNameList);
  });

  const evictionUnsuccessfulReturnNameList = document.querySelector<HTMLSelectElement>(
    '#eviction-unsuccessful-return-name'
  );
  evictionUnsuccessfulReturnNameList?.addEventListener('change', _ => {
    handleEvictionUnsuccessfulShowConditions(evictionUnsuccessfulReturnNameList);
  });

  const interimReturnNameList = document.querySelector<HTMLSelectElement>('#interim-return-name');
  interimReturnNameList?.addEventListener('change', _ => {
    handleInterimShowConditions(interimReturnNameList);
  });
}

function handleReturnTypeShowConditions(returnTypeList: HTMLSelectElement) {
  const finalOutcome = document.querySelector<HTMLDivElement>('#final-outcome');
  const interim = document.querySelector<HTMLDivElement>('#interim');

  if (returnTypeList.value === WarrantReturnType.FINAL) {
    finalOutcome!.classList.remove('govuk-!-display-none');
    interim?.classList.add('govuk-!-display-none');
    resetInterimReturnNames();
  } else if (returnTypeList.value === WarrantReturnType.INTERIM) {
    finalOutcome!.classList.add('govuk-!-display-none');
    interim?.classList.remove('govuk-!-display-none');
    resetFinalOutcomeInputs();
    resetEvictionSuccessfulInput();
    resetEvictionUnsuccessfulInput();
  } else {
    finalOutcome?.classList.remove('govuk-!-display-none');
    interim?.classList.remove('govuk-!-display-none');
    resetAllInputs();
  }
}

function handleFinalOutcomeShowConditions(finalOutcomeList: HTMLSelectElement): void {
  const evictionSuccessful = document.querySelector<HTMLDivElement>('#eviction-successful');
  const evictionUnsuccessfulCancelled = document.querySelector<HTMLDivElement>('#eviction-unsuccessful-cancelled');
  if (finalOutcomeList?.value === EvictionOutcome.SUCCESSFUL) {
    evictionSuccessful?.classList.remove('govuk-!-display-none');
    evictionUnsuccessfulCancelled?.classList.add('govuk-!-display-none');
    resetEvictionUnsuccessfulInput();
  } else if (
    finalOutcomeList?.value === EvictionOutcome.UNSUCCESSFUL ||
    finalOutcomeList?.value === EvictionOutcome.CANCELLED
  ) {
    evictionSuccessful?.classList.add('govuk-!-display-none');
    evictionUnsuccessfulCancelled?.classList.remove('govuk-!-display-none');
    resetEvictionSuccessfulInput();
  } else {
    evictionSuccessful?.classList.remove('govuk-!-display-none');
    evictionUnsuccessfulCancelled?.classList.remove('govuk-!-display-none');
    resetEvictionSuccessfulInput();
    resetEvictionUnsuccessfulInput();
  }

  handleAdditionalDetailsShowConditions(true);
}

function handleEvictionSuccessfulShowConditions(evictionSuccessfulReturnNameList: HTMLSelectElement): void {
  if (evictionSuccessfulReturnNameList.value === EvictionSuccessfulReturnName.EVICTION_SUCCESSFUL) {
    handleAdditionalDetailsShowConditions(true);
  } else {
    handleAdditionalDetailsShowConditions(false);
  }
}

function handleEvictionUnsuccessfulShowConditions(evictionUnsuccessfulReturnNameList: HTMLSelectElement): void {
  if (
    isAdditionalDetailsMandatoryEvictionUnsuccessful(
      evictionUnsuccessfulReturnNameList.value as EvictionUnsuccessfulReturnName
    )
  ) {
    handleAdditionalDetailsShowConditions(true);
  } else {
    handleAdditionalDetailsShowConditions(false);
  }
}

function handleInterimShowConditions(interimReturnNameList: HTMLSelectElement): void {
  if (isAdditionalDetailsMandatoryInterim(interimReturnNameList.value as InterimReturnName)) {
    handleAdditionalDetailsShowConditions(true);
  } else {
    handleAdditionalDetailsShowConditions(false);
  }
}

function handleAdditionalDetailsShowConditions(isMandatory: boolean) {
  const label = document.getElementById('additional-details-label');
  label!.textContent = isMandatory ? 'Additional details' : 'Additional details (Optional)';
}

function resetAllInputs(): void {
  resetInterimReturnNames();
  resetFinalOutcomeInputs();
  resetEvictionSuccessfulInput();
  resetEvictionUnsuccessfulInput();
  handleAdditionalDetailsShowConditions(true);
}

function resetFinalOutcomeInputs(): void {
  const finalOutcomeList = document.querySelector<HTMLSelectElement>('[final-outcome]');
  finalOutcomeList!.value = '';
}

function resetInterimReturnNames(): void {
  const interimReturnNameList = document.querySelector<HTMLSelectElement>('[interim-return-name]');
  interimReturnNameList!.value = '';
}

function resetEvictionSuccessfulInput(): void {
  const evictionSuccessfulReturnNameList = document.querySelector<HTMLSelectElement>(
    '#eviction-successful-return-name'
  );
  evictionSuccessfulReturnNameList!.value = '';
}

function resetEvictionUnsuccessfulInput(): void {
  const evictionUnsuccessfulReturnNameList = document.querySelector<HTMLSelectElement>(
    '#eviction-unsuccessful-return-nameß'
  );
  evictionUnsuccessfulReturnNameList!.value = '';
}
