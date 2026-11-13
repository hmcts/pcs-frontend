import { normalizeYesNoValue } from '../steps/utils/normalizeYesNoValue';

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
  evictionOutcome?: EvictionOutcome;
  additionalDetails?: string;
  outcomeDate?: string;
}

export interface EvictionSummaryData {
  card: {
    title: {
      text: string;
    };
  };
  rows: {
    key: {
      text: string;
    };
    value: {
      text?: string;
      html?: string;
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
    if (normalizeYesNoValue(party.nameKnown) === 'YES') {
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
    EvictionUnsuccessfulReturnName.WARRANT_ISSUED_IN_ERROR,
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

export interface WarrantReturnSelection {
  returnType: string;
  finalOutcome: string;
  evictionSuccessfulReturnName: string;
  evictionUnsuccessfulReturnName: string;
  interimReturnName: string;
}

export function isAdditionalDetailsMandatory(selection: WarrantReturnSelection): boolean {
  if (selection.returnType === WarrantReturnType.INTERIM) {
    const returnName = selection.interimReturnName;
    return !returnName || isAdditionalDetailsMandatoryInterim(returnName as InterimReturnName);
  }
  if (selection.returnType === WarrantReturnType.FINAL) {
    if (selection.finalOutcome === EvictionOutcome.SUCCESSFUL) {
      const returnName = selection.evictionSuccessfulReturnName;
      return !returnName || returnName === EvictionSuccessfulReturnName.EVICTION_SUCCESSFUL;
    }
    if (
      selection.finalOutcome === EvictionOutcome.UNSUCCESSFUL ||
      selection.finalOutcome === EvictionOutcome.CANCELLED
    ) {
      const returnName = selection.evictionUnsuccessfulReturnName;
      return (
        !returnName || isAdditionalDetailsMandatoryEvictionUnsuccessful(returnName as EvictionUnsuccessfulReturnName)
      );
    }
  }
  return true;
}

const HIDDEN_CLASS = 'govuk-!-display-none';
const DEFAULT_ADDITIONAL_DETAILS_LABEL = 'Additional details';
const OPTIONAL_ADDITIONAL_DETAILS_LABEL = 'Additional details (Optional)';
const EVICTION_DATE_INPUT_IDS = [
  'eviction-date-day',
  'eviction-date-month',
  'eviction-date-year',
  'eviction-date-hour',
  'eviction-date-minute',
];

export function initWarrantReturn(): void {
  const returnTypeList = document.querySelector<HTMLSelectElement>('select#return-type');
  if (!returnTypeList) {
    return;
  }

  const selectIds = [
    'return-type',
    'final-outcome',
    'eviction-successful-return-name',
    'eviction-unsuccessful-return-name',
    'interim-return-name',
  ];
  for (const id of selectIds) {
    getSelect(id)?.addEventListener('change', updateWarrantReturnVisibility);
  }

  updateWarrantReturnVisibility();
}

function updateWarrantReturnVisibility(): void {
  const returnType = getSelect('return-type')?.value;

  const isFinal = returnType === WarrantReturnType.FINAL;
  setSectionVisible('final-outcome-section', isFinal, () => resetSelect('final-outcome'));

  const finalOutcome = getSelect('final-outcome')?.value;

  const isEvictionSuccessful = isFinal && finalOutcome === EvictionOutcome.SUCCESSFUL;
  setSectionVisible('eviction-successful', isEvictionSuccessful, () => {
    resetSelect('eviction-successful-return-name');
  });

  const isEvictionUnsuccessfulOrCancelled =
    isFinal && (finalOutcome === EvictionOutcome.UNSUCCESSFUL || finalOutcome === EvictionOutcome.CANCELLED);
  setSectionVisible('eviction-unsuccessful-cancelled', isEvictionUnsuccessfulOrCancelled, () =>
    resetSelect('eviction-unsuccessful-return-name')
  );

  const isInterim = returnType === WarrantReturnType.INTERIM;
  setSectionVisible('interim', isInterim, () => resetSelect('interim-return-name'));

  const isEvictionDateVisible = isEvictionSuccessful || isEvictionUnsuccessfulOrCancelled || isInterim;
  setSectionVisible('eviction-date-section', isEvictionDateVisible, () => EVICTION_DATE_INPUT_IDS.forEach(resetInput));

  updateAdditionalDetailsLabel();
}

function updateAdditionalDetailsLabel(): void {
  const label = document.getElementById('additional-details-label');
  if (!label) {
    return;
  }

  const isMandatory = isAdditionalDetailsMandatory({
    returnType: getSelect('return-type')?.value ?? '',
    finalOutcome: getSelect('final-outcome')?.value ?? '',
    evictionSuccessfulReturnName: getSelect('eviction-successful-return-name')?.value ?? '',
    evictionUnsuccessfulReturnName: getSelect('eviction-unsuccessful-return-name')?.value ?? '',
    interimReturnName: getSelect('interim-return-name')?.value ?? '',
  });

  label.textContent = isMandatory ? DEFAULT_ADDITIONAL_DETAILS_LABEL : OPTIONAL_ADDITIONAL_DETAILS_LABEL;
}

function setSectionVisible(sectionId: string, isVisible: boolean, resetInputs: () => void): void {
  document.getElementById(sectionId)?.classList.toggle(HIDDEN_CLASS, !isVisible);
  if (!isVisible) {
    resetInputs();
  }
}

function getSelect(id: string): HTMLSelectElement | null {
  return document.querySelector<HTMLSelectElement>(`select#${id}`);
}

function resetSelect(id: string): void {
  const select = getSelect(id);
  if (select) {
    select.value = '';
  }
}

function resetInput(id: string): void {
  const input = document.querySelector<HTMLInputElement>(`input#${id}`);
  if (input) {
    input.value = '';
  }
}
