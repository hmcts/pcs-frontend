import { randomUUID } from 'crypto';

import type { Request } from 'express';

import { penceToPounds, strictPoundsToPence } from '../utils/currencyConversion';

import { offeredProofTypes } from './conditions';
import { todayInLondon } from './dates';
import { FIELD_LIMITS } from './fieldLimits';
import {
  type FormBody,
  UNREADABLE,
  addressFromBody,
  addressToForm,
  checkedValues,
  dateFromBody,
  fromYesNo,
  indexFromQuery,
  isReadable,
  oneOf,
  readDate,
  readPence,
  text,
  toDateParts,
  toYesNo,
} from './formValues';
import {
  type RentPeriodsInput,
  type StatementRange,
  addRentTablePayment,
  exceedsRentPeriodLimit,
  mergeRentPeriods,
  removeRentTablePayment,
  rentPeriodEnd,
  rentPeriodsWithinLimit,
  statementRangeOf,
} from './rentHistory';

import type { CcdCaseAddress, CcdCollectionItem } from '@services/ccdCase.interface';
import {
  type CitizenAdditionalClaimant,
  type CitizenDefendant,
  type CitizenPossessionClaim,
  DISCRETIONARY_OTHER_GROUNDS,
  EXCLUDED_GROUNDS,
  type GroundReason,
  MANDATORY_OTHER_GROUNDS,
  NOTICE_METHODS,
  NOTICE_METHOD_DETAILS,
  type NoticeMethod,
  OTHER_GROUND,
  type OtherGround,
  type ProofType,
  RENT_ARREARS_GROUNDS,
  type RentFrequency,
  type RentTableRow,
  groundsNeedingReasons,
} from '@services/citizenPossessionClaim.interface';

/**
 * How each make a claim page reads its answers from the saved claim and writes them back. Every translation
 * between the form and pcs-api's `citizenPossessionClaim` happens here.
 */
export interface StepMapping {
  toForm?: (claim: CitizenPossessionClaim, req: Request) => FormBody;
  fromForm?: (claim: CitizenPossessionClaim, body: FormBody, req: Request) => void;
  isAnswered?: (claim: CitizenPossessionClaim, req: Request) => boolean;
  /** For a page asked once for each of several items, the query naming the first item not yet answered. */
  unansweredQuery?: (claim: CitizenPossessionClaim) => string | undefined;
}

export const TENANCY_TYPES = ['ASSURED', 'EXCLUDED', 'REGULATED', 'OTHER'] as const;
export const OCCUPATION_CONTRACT_TYPES = ['STANDARD_CONTRACT', 'SECURE_CONTRACT', 'OTHER'] as const;
export const NOTICE_TYPES = ['NOTICE_SEEKING_POSSESSION', 'NOTICE_TO_QUIT', 'OTHER'] as const;
export const RENT_FREQUENCIES: readonly RentFrequency[] = ['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'OTHER'];
export const PROOF_TYPES: readonly ProofType[] = ['UPLOAD_STATEMENT', 'TABLE'];
export const LANGUAGES = ['ENGLISH', 'WELSH', 'ENGLISH_AND_WELSH'] as const;
export const ORGANISATION_TYPES = ['INDIVIDUAL', 'ORGANISATION'] as const;

/** The prefix of the additional claimant address page's fields. */
export const ADDITIONAL_CLAIMANT_ADDRESS = 'additionalClaimant';

type NoticeDetailKey = 'postedDate' | 'deliveredDate' | 'handedDate' | 'handedToName' | 'emailedDate' | 'emailedTo';

export function propertyAddressOf(req: Request): CcdCaseAddress | undefined {
  const data = req.res?.locals.validatedCase?.data;
  return data?.citizenPossessionClaim?.propertyAddress ?? data?.propertyAddress;
}

export function accountEmailOf(req: Request): string | undefined {
  return text(req.session?.user?.email);
}

/** The account's email when it is short enough for pcs-api to keep. */
export function usableAccountEmailOf(req: Request): string | undefined {
  const email = accountEmailOf(req);
  return email && email.length <= FIELD_LIMITS.emailAddress ? email : undefined;
}

/** The defendant a defendant page is about: ?index=n, or the first. */
export function defendantIndexOf(req: Request): number {
  return indexFromQuery(req.query?.index) ?? 0;
}

function defendantAt(claim: CitizenPossessionClaim, index: number): CitizenDefendant | undefined {
  return claim.defendants?.[index]?.value;
}

function updateDefendant(claim: CitizenPossessionClaim, index: number, update: (d: CitizenDefendant) => void): void {
  const defendants = [...(claim.defendants ?? [])];
  const position = Math.min(index, defendants.length);
  const existing = defendants[position] ?? { id: newItemId(), value: {} };
  const value = { ...existing.value };
  update(value);
  defendants[position] = { ...existing, value };
  claim.defendants = defendants;
}

/** The additional claimant an additional claimant page is about: ?index=n, or the first. */
export function additionalClaimantIndexOf(req: Request): number {
  return indexFromQuery(req.query?.index) ?? 0;
}

function additionalClaimantAt(claim: CitizenPossessionClaim, index: number): CitizenAdditionalClaimant | undefined {
  return claim.additionalClaimants?.[index]?.value;
}

function updateAdditionalClaimant(
  claim: CitizenPossessionClaim,
  index: number,
  update: (claimant: CitizenAdditionalClaimant) => void
): void {
  const claimants = [...(claim.additionalClaimants ?? [])];
  const position = Math.min(index, claimants.length);
  const existing = claimants[position] ?? { id: newItemId(), value: {} };
  const value = { ...existing.value };
  update(value);
  claimants[position] = { ...existing, value };
  claim.additionalClaimants = claimants;
}

/** Whether every question has been answered for an additional claimant. */
export function additionalClaimantAnswered(claimant: CitizenAdditionalClaimant | undefined): boolean {
  if (!claimant?.individualOrOrganisation) {
    return false;
  }
  const named =
    claimant.individualOrOrganisation === 'INDIVIDUAL'
      ? Boolean(claimant.firstName && claimant.lastName)
      : Boolean(claimant.organisationName);
  return (
    named &&
    Boolean(claimant.address?.AddressLine1) &&
    claimant.emailAddress !== undefined &&
    (claimant.contactByPhone === 'NO' || (claimant.contactByPhone === 'YES' && Boolean(claimant.phoneNumber))) &&
    (claimant.contactByText === 'NO' || (claimant.contactByText === 'YES' && Boolean(claimant.textMessageNumber)))
  );
}

/** The additional claimant to ask about next: the first not fully answered, else a new one. */
export function nextAdditionalClaimantIndex(claim: CitizenPossessionClaim): number {
  const claimants = claim.additionalClaimants ?? [];
  const unanswered = claimants.findIndex(claimant => !additionalClaimantAnswered(claimant.value));
  return unanswered === -1 ? claimants.length : unanswered;
}

function setNested<K extends keyof CitizenPossessionClaim>(
  claim: CitizenPossessionClaim,
  key: K,
  update: (value: NonNullable<CitizenPossessionClaim[K]>) => void
): void {
  const value = { ...((claim[key] ?? {}) as object) } as NonNullable<CitizenPossessionClaim[K]>;
  update(value);
  claim[key] = value;
}

/**
 * An optional answer: Save and continue with it blank answers it with nothing to add (an empty string), while
 * Save for later with it blank leaves it unanswered.
 */
function optionalText(value: unknown, body: FormBody): string | undefined {
  return isSaveForLater(body) ? text(value) : (text(value) ?? '');
}

function isSaveForLater(body: FormBody): boolean {
  return body.action === 'saveForLater';
}

function yesNoStep<K extends keyof CitizenPossessionClaim>(
  key: K,
  field: string,
  read: (claim: CitizenPossessionClaim) => string | undefined
): StepMapping {
  return {
    toForm: claim => ({ [field]: fromYesNo(read(claim) as 'YES' | 'NO' | undefined) }),
    fromForm: (claim, body) =>
      setNested(claim, key, value => {
        (value as Record<string, unknown>)[field] = toYesNo(body[field]);
      }),
    isAnswered: claim => read(claim) !== undefined,
  };
}

/** A yes or no question whose other answer asks why, as for documents the claimant cannot upload. */
function withReason<K extends 'tenancy' | 'notice'>(
  key: K,
  field: string,
  reasonField: string,
  reasonOn: 'yes' | 'no'
): StepMapping {
  const read = (claim: CitizenPossessionClaim) => claim[key] as Record<string, string | undefined> | undefined;
  return {
    toForm: claim => ({
      [field]: fromYesNo(read(claim)?.[field] as 'YES' | 'NO' | undefined),
      [`${field}.${reasonField}`]: read(claim)?.[reasonField],
    }),
    fromForm: (claim, body) =>
      setNested(claim, key, value => {
        const writable = value as Record<string, unknown>;
        writable[field] = toYesNo(body[field]);
        writable[reasonField] = body[field] === reasonOn ? text(body[`${field}.${reasonField}`]) : undefined;
      }),
    isAnswered: claim => read(claim)?.[field] !== undefined,
  };
}

function moneyStep(field: 'rentAmount' | 'arrearsAtNoticeDate' | 'currentArrears'): StepMapping {
  return {
    toForm: claim => ({ [field]: penceToPounds(claim.rentArrears?.[field]) }),
    fromForm: (claim, body) =>
      setNested(claim, 'rentArrears', rentArrears => {
        rentArrears[field] = readPence(body[field]);
      }),
    isAnswered: claim => claim.rentArrears?.[field] !== undefined,
  };
}

/** The period the rent statement covers: the dates the claimant gave, or else as its rows show it. */
export function rentStatementRange(claim: CitizenPossessionClaim, req: Request): StatementRange | undefined {
  const caseId = req.res?.locals.validatedCase?.id;
  const given = caseId ? req.session?.rentStatementPeriods?.[caseId] : undefined;
  if (given) {
    return given;
  }
  return statementRangeOf(claim.rentArrears?.rentHistoryTable, claim.rentArrears ?? {});
}

export const defendantAddressAnswered = (defendant: CitizenDefendant | undefined): boolean =>
  defendant?.addressKnown !== undefined &&
  (defendant.addressKnown === 'NO' || defendant.addressSameAsProperty !== undefined);

/** Remembers the period the claimant gave for this claim's rent statement, which the claim itself has no field for. */
function rememberStatementPeriod(req: Request, range: StatementRange): void {
  const caseId = req.res?.locals.validatedCase?.id;
  if (caseId && req.session) {
    req.session.rentStatementPeriods = { ...req.session.rentStatementPeriods, [caseId]: range };
  }
}

type RentArrears = NonNullable<CitizenPossessionClaim['rentArrears']>;

/** What to lay a rent statement out again from, or undefined when there is no statement to lay out again. */
function regenerationInput(
  rentArrears: RentArrears | undefined,
  range: StatementRange | undefined
): RentPeriodsInput | undefined {
  if (
    !range ||
    !isReadable(rentArrears?.rentAmount) ||
    !rentArrears?.rentFrequency ||
    (rentArrears.rentDueDay as unknown) === UNREADABLE ||
    !rentArrears.rentHistoryTable?.length
  ) {
    return undefined;
  }
  return {
    rentAmount: rentArrears.rentAmount,
    rentFrequency: rentArrears.rentFrequency,
    rentDueDay: rentArrears.rentDueDay,
    ...range,
  };
}

/**
 * Lays the rent statement out again over the same period after the rent, how often or the due day changed.
 * False, leaving the statement as it was, when the period would then hold more rent periods than it can show.
 */
function regenerateRentTable(claim: CitizenPossessionClaim, range: StatementRange | undefined): boolean {
  const rentArrears = claim.rentArrears;
  const input = regenerationInput(rentArrears, range);
  if (!rentArrears || !input) {
    return true;
  }
  const generated = rentPeriodsWithinLimit(input);
  if (!generated) {
    return false;
  }
  rentArrears.rentHistoryTable = mergeRentPeriods(generated, rentArrears.rentHistoryTable);
  return true;
}

/**
 * Applies a change to the rent, then lays out again the statement it was the basis of. A change that would give
 * the statement more rent periods than it can show is not kept, since Save for later skips the page's check.
 */
function changeRent(claim: CitizenPossessionClaim, req: Request, change: () => void): void {
  const range = rentStatementRange(claim, req);
  const before = claim.rentArrears;
  change();
  if (!regenerateRentTable(claim, range)) {
    claim.rentArrears = before;
  }
}

/** Whether changing how often or on which day rent is due would give the rent statement too many periods. */
export function rentChangeExceedsLimit(
  claim: CitizenPossessionClaim,
  req: Request,
  change: Pick<RentArrears, 'rentFrequency'> | Pick<RentArrears, 'rentDueDay'>
): boolean {
  const input = regenerationInput({ ...claim.rentArrears, ...change }, rentStatementRange(claim, req));
  return input !== undefined && exceedsRentPeriodLimit(input);
}

function documentsAnswered(documents: unknown[] | undefined): boolean {
  return Array.isArray(documents) && documents.length > 0;
}

export const claimMappings: Record<string, StepMapping> = {
  'individual-or-organisation': {
    toForm: claim => ({ individualOrOrganisation: claim.claimant?.individualOrOrganisation }),
    fromForm: (claim, body) =>
      setNested(claim, 'claimant', claimant => {
        claimant.individualOrOrganisation = oneOf(body.individualOrOrganisation, ORGANISATION_TYPES);
      }),
    isAnswered: claim => claim.claimant?.individualOrOrganisation !== undefined,
  },

  'claimant-name': {
    toForm: claim => ({ firstName: claim.claimant?.firstName, lastName: claim.claimant?.lastName }),
    fromForm: (claim, body) =>
      setNested(claim, 'claimant', claimant => {
        claimant.firstName = text(body.firstName);
        claimant.lastName = text(body.lastName);
      }),
    isAnswered: claim => Boolean(claim.claimant?.firstName && claim.claimant?.lastName),
  },

  'organisation-name': {
    toForm: claim => ({ organisationName: claim.claimant?.organisationName }),
    fromForm: (claim, body) =>
      setNested(claim, 'claimant', claimant => {
        claimant.organisationName = text(body.organisationName);
      }),
    isAnswered: claim => Boolean(claim.claimant?.organisationName),
  },

  'claimant-address': {
    toForm: claim => addressToForm(claim.claimant?.address, 'claimant'),
    fromForm: (claim, body) =>
      setNested(claim, 'claimant', claimant => {
        claimant.address = addressFromBody(body, 'claimant');
      }),
    isAnswered: claim => Boolean(claim.claimant?.address?.AddressLine1),
  },

  'claimant-email': {
    toForm: (claim, req) => {
      const { contactByEmail, emailAddress } = claim.claimant ?? {};
      return contactByEmail === 'NO' || !usableAccountEmailOf(req)
        ? { useAccountEmail: 'no', 'useAccountEmail.emailAddress': emailAddress }
        : { useAccountEmail: fromYesNo(contactByEmail) };
    },
    fromForm: (claim, body, req) =>
      setNested(claim, 'claimant', claimant => {
        claimant.contactByEmail = toYesNo(body.useAccountEmail);
        if (claimant.contactByEmail === 'YES' && !usableAccountEmailOf(req)) {
          claimant.contactByEmail = undefined;
        }
        claimant.emailAddress =
          claimant.contactByEmail === 'YES'
            ? usableAccountEmailOf(req)
            : claimant.contactByEmail === 'NO'
              ? text(body['useAccountEmail.emailAddress'])
              : undefined;
      }),
    isAnswered: claim => Boolean(claim.claimant?.emailAddress),
  },

  'claimant-phone': {
    toForm: claim => ({
      contactByPhone: fromYesNo(claim.claimant?.contactByPhone),
      'contactByPhone.phoneNumber': claim.claimant?.phoneNumber,
    }),
    fromForm: (claim, body) =>
      setNested(claim, 'claimant', claimant => {
        claimant.contactByPhone = toYesNo(body.contactByPhone);
        claimant.phoneNumber = claimant.contactByPhone === 'YES' ? text(body['contactByPhone.phoneNumber']) : undefined;
      }),
    isAnswered: claim => claim.claimant?.contactByPhone !== undefined,
  },

  'claimant-text-message': {
    toForm: claim => ({
      contactByText: fromYesNo(claim.claimant?.contactByText),
      'contactByText.textMessageNumber': claim.claimant?.textMessageNumber,
    }),
    fromForm: (claim, body) =>
      setNested(claim, 'claimant', claimant => {
        claimant.contactByText = toYesNo(body.contactByText);
        const number = claimant.contactByText === 'YES' ? text(body['contactByText.textMessageNumber']) : undefined;
        claimant.textMessageNumber = number && number !== claimant.phoneNumber ? number : undefined;
      }),
    isAnswered: claim => {
      const { contactByText, phoneNumber, textMessageNumber } = claim.claimant ?? {};
      return contactByText === 'NO' || (contactByText === 'YES' && Boolean(phoneNumber || textMessageNumber));
    },
  },

  'multiple-claimants': {
    // Once another claimant has been added the question is asked again, so it starts unanswered
    toForm: claim =>
      claim.additionalClaimants?.some(claimant => additionalClaimantAnswered(claimant.value))
        ? {}
        : { multipleClaimants: fromYesNo(claim.claimant?.multipleClaimants) },
    // Answering No after adding claimants means there are no more to add, so the ones added stay
    fromForm: (claim, body) => {
      const answered = toYesNo(body.multipleClaimants);
      if (answered === 'NO') {
        claim.additionalClaimants = (claim.additionalClaimants ?? []).filter(claimant =>
          additionalClaimantAnswered(claimant.value)
        );
      }
      setNested(claim, 'claimant', claimant => {
        claimant.multipleClaimants = answered === 'NO' && claim.additionalClaimants?.length ? 'YES' : answered;
      });
    },
    isAnswered: claim =>
      claim.claimant?.multipleClaimants === 'NO' ||
      (claim.claimant?.multipleClaimants === 'YES' &&
        Boolean(claim.additionalClaimants?.length) &&
        (claim.additionalClaimants ?? []).every(claimant => additionalClaimantAnswered(claimant.value))),
  },

  'additional-claimant-type': {
    toForm: (claim, req) => ({
      individualOrOrganisation: additionalClaimantAt(claim, additionalClaimantIndexOf(req))?.individualOrOrganisation,
    }),
    fromForm: (claim, body, req) =>
      updateAdditionalClaimant(claim, additionalClaimantIndexOf(req), claimant => {
        claimant.individualOrOrganisation = oneOf(body.individualOrOrganisation, ORGANISATION_TYPES);
      }),
  },

  'additional-claimant-name': {
    toForm: (claim, req) => {
      const claimant = additionalClaimantAt(claim, additionalClaimantIndexOf(req));
      return { firstName: claimant?.firstName, lastName: claimant?.lastName };
    },
    fromForm: (claim, body, req) =>
      updateAdditionalClaimant(claim, additionalClaimantIndexOf(req), claimant => {
        claimant.firstName = text(body.firstName);
        claimant.lastName = text(body.lastName);
      }),
  },

  'additional-claimant-organisation-name': {
    toForm: (claim, req) => ({
      organisationName: additionalClaimantAt(claim, additionalClaimantIndexOf(req))?.organisationName,
    }),
    fromForm: (claim, body, req) =>
      updateAdditionalClaimant(claim, additionalClaimantIndexOf(req), claimant => {
        claimant.organisationName = text(body.organisationName);
      }),
  },

  'additional-claimant-address': {
    toForm: (claim, req) =>
      addressToForm(additionalClaimantAt(claim, additionalClaimantIndexOf(req))?.address, ADDITIONAL_CLAIMANT_ADDRESS),
    fromForm: (claim, body, req) =>
      updateAdditionalClaimant(claim, additionalClaimantIndexOf(req), claimant => {
        claimant.address = addressFromBody(body, ADDITIONAL_CLAIMANT_ADDRESS);
      }),
  },

  'additional-claimant-email': {
    toForm: (claim, req) => ({
      emailAddress: additionalClaimantAt(claim, additionalClaimantIndexOf(req))?.emailAddress,
    }),
    fromForm: (claim, body, req) =>
      updateAdditionalClaimant(claim, additionalClaimantIndexOf(req), claimant => {
        claimant.emailAddress = optionalText(body.emailAddress, body);
      }),
  },

  'additional-claimant-phone': {
    toForm: (claim, req) => {
      const claimant = additionalClaimantAt(claim, additionalClaimantIndexOf(req));
      return {
        contactByPhone: fromYesNo(claimant?.contactByPhone),
        'contactByPhone.phoneNumber': claimant?.phoneNumber,
      };
    },
    fromForm: (claim, body, req) =>
      updateAdditionalClaimant(claim, additionalClaimantIndexOf(req), claimant => {
        claimant.contactByPhone = toYesNo(body.contactByPhone);
        claimant.phoneNumber = claimant.contactByPhone === 'YES' ? text(body['contactByPhone.phoneNumber']) : undefined;
      }),
  },

  'additional-claimant-text-message': {
    toForm: (claim, req) => {
      const claimant = additionalClaimantAt(claim, additionalClaimantIndexOf(req));
      return {
        contactByText: fromYesNo(claimant?.contactByText),
        'contactByText.textMessageNumber': claimant?.textMessageNumber,
      };
    },
    fromForm: (claim, body, req) =>
      updateAdditionalClaimant(claim, additionalClaimantIndexOf(req), claimant => {
        claimant.contactByText = toYesNo(body.contactByText);
        claimant.textMessageNumber =
          claimant.contactByText === 'YES' ? text(body['contactByText.textMessageNumber']) : undefined;
      }),
  },

  'defendant-name': {
    toForm: (claim, req) => {
      const defendant = defendantAt(claim, defendantIndexOf(req));
      return {
        nameKnown: fromYesNo(defendant?.nameKnown),
        'nameKnown.firstName': defendant?.firstName,
        'nameKnown.lastName': defendant?.lastName,
      };
    },
    fromForm: (claim, body, req) => {
      if (defendantIndexOf(req) >= (claim.defendants?.length ?? 0)) {
        claim.defendantsConfirmed = 'NO';
      }
      updateDefendant(claim, defendantIndexOf(req), defendant => {
        defendant.nameKnown = toYesNo(body.nameKnown);
        defendant.firstName = defendant.nameKnown === 'YES' ? text(body['nameKnown.firstName']) : undefined;
        defendant.lastName = defendant.nameKnown === 'YES' ? text(body['nameKnown.lastName']) : undefined;
      });
    },
    isAnswered: claim => defendantAt(claim, 0)?.nameKnown !== undefined,
  },

  'defendant-address': {
    toForm: (claim, req) => {
      const defendant = defendantAt(claim, defendantIndexOf(req));
      if (defendant?.addressSameAsProperty === 'YES') {
        return { sameAsProperty: 'yes' };
      }
      return defendant?.addressSameAsProperty === 'NO'
        ? { sameAsProperty: 'no', ...addressToForm(defendant.address, 'defendant') }
        : {};
    },
    fromForm: (claim, body, req) =>
      updateDefendant(claim, defendantIndexOf(req), defendant => {
        defendant.addressSameAsProperty = toYesNo(body.sameAsProperty);
        defendant.address = defendant.addressSameAsProperty === 'NO' ? addressFromBody(body, 'defendant') : undefined;
        defendant.addressKnown = defendant.addressSameAsProperty === 'YES' || defendant.address ? 'YES' : undefined;
      }),
    isAnswered: claim => defendantAt(claim, 0)?.addressSameAsProperty !== undefined,
  },

  'additional-defendants': {
    toForm: claim => (claim.defendantsConfirmed === 'YES' ? { additionalDefendants: 'no' } : {}),
    fromForm: (claim, body) => {
      claim.defendantsConfirmed = body.additionalDefendants === 'no' ? 'YES' : 'NO';
    },
    isAnswered: claim =>
      claim.defendantsConfirmed === 'YES' &&
      Boolean(claim.defendants?.length) &&
      (claim.defendants ?? []).every(defendant => defendantAddressAnswered(defendant.value)),
  },

  'tenancy-type': {
    toForm: claim => ({
      tenancyType: claim.tenancy?.tenancyType,
      'tenancyType.otherTenancyTypeDetails': claim.tenancy?.otherTenancyTypeDetails,
    }),
    fromForm: (claim, body) =>
      setNested(claim, 'tenancy', tenancy => {
        tenancy.tenancyType = oneOf(body.tenancyType, TENANCY_TYPES);
        tenancy.otherTenancyTypeDetails =
          tenancy.tenancyType === 'OTHER' ? text(body['tenancyType.otherTenancyTypeDetails']) : undefined;
      }),
    isAnswered: claim => claim.tenancy?.tenancyType !== undefined,
  },

  'tenancy-start-date': {
    toForm: claim => ({ tenancyStartDate: toDateParts(claim.tenancy?.tenancyStartDate) }),
    fromForm: (claim, body) =>
      setNested(claim, 'tenancy', tenancy => {
        tenancy.tenancyStartDate = readDate(body, 'tenancyStartDate');
      }),
    isAnswered: claim => claim.tenancy?.tenancyStartDate !== undefined,
  },

  'tenancy-agreement': withReason('tenancy', 'tenancyAgreementAvailable', 'noTenancyAgreementReason', 'no'),

  'upload-tenancy-agreement': {
    isAnswered: claim => documentsAnswered(claim.tenancy?.tenancyAgreementDocuments),
  },

  'occupation-contract-type': {
    toForm: claim => ({
      occupationContractType: claim.tenancy?.occupationContractType,
      'occupationContractType.otherOccupationContractDetails': claim.tenancy?.otherOccupationContractDetails,
    }),
    fromForm: (claim, body) =>
      setNested(claim, 'tenancy', tenancy => {
        tenancy.occupationContractType = oneOf(body.occupationContractType, OCCUPATION_CONTRACT_TYPES);
        tenancy.otherOccupationContractDetails =
          tenancy.occupationContractType === 'OTHER'
            ? text(body['occupationContractType.otherOccupationContractDetails'])
            : undefined;
      }),
    isAnswered: claim => claim.tenancy?.occupationContractType !== undefined,
  },

  'occupation-contract-start-date': {
    toForm: claim => ({ occupationContractStartDate: toDateParts(claim.tenancy?.tenancyStartDate) }),
    fromForm: (claim, body) =>
      setNested(claim, 'tenancy', tenancy => {
        tenancy.tenancyStartDate = readDate(body, 'occupationContractStartDate');
      }),
    isAnswered: claim => claim.tenancy?.tenancyStartDate !== undefined,
  },

  'occupation-contract-agreement': withReason('tenancy', 'tenancyAgreementAvailable', 'noTenancyAgreementReason', 'no'),

  'upload-occupation-contract': {
    isAnswered: claim => documentsAnswered(claim.tenancy?.tenancyAgreementDocuments),
  },

  'rent-arrears-claim': yesNoStep('grounds', 'hasRentArrearsGrounds', claim => claim.grounds?.hasRentArrearsGrounds),

  'rent-arrears-grounds': {
    toForm: claim => ({ rentArrearsGrounds: claim.grounds?.rentArrearsGrounds ?? [] }),
    fromForm: (claim, body) =>
      setNested(claim, 'grounds', grounds => {
        grounds.rentArrearsGrounds = checkedValues(body.rentArrearsGrounds, RENT_ARREARS_GROUNDS);
      }),
    isAnswered: claim => Boolean(claim.grounds?.rentArrearsGrounds?.length),
  },

  'other-grounds-claim': yesNoStep('grounds', 'hasOtherGrounds', claim => claim.grounds?.hasOtherGrounds),

  'other-grounds': {
    toForm: claim => {
      const selected = claim.grounds?.otherGrounds ?? [];
      return {
        mandatoryGrounds: selected.filter(ground => (MANDATORY_OTHER_GROUNDS as readonly string[]).includes(ground)),
        otherGround: selected.filter(ground => ground === OTHER_GROUND),
        'otherGround.otherGroundsDetails': claim.grounds?.otherGroundsDetails,
        discretionaryGrounds: selected.filter(ground =>
          (DISCRETIONARY_OTHER_GROUNDS as readonly string[]).includes(ground)
        ),
      };
    },
    fromForm: (claim, body) =>
      setNested(claim, 'grounds', grounds => {
        grounds.otherGrounds = [
          ...checkedValues(body.mandatoryGrounds, MANDATORY_OTHER_GROUNDS),
          ...checkedValues(body.discretionaryGrounds, DISCRETIONARY_OTHER_GROUNDS),
          ...checkedValues(body.otherGround, [OTHER_GROUND] as const),
        ];
        grounds.otherGroundsDetails = grounds.otherGrounds.includes(OTHER_GROUND)
          ? text(body['otherGround.otherGroundsDetails'])
          : undefined;
        grounds.groundReasons = (grounds.groundReasons ?? []).filter(
          item => item.value.ground && grounds.otherGrounds?.includes(item.value.ground)
        );
      }),
    isAnswered: claim => Boolean(claim.grounds?.otherGrounds?.length),
  },

  'ground-reason': {
    toForm: (claim, req) => {
      const ground = groundForReasonOf(req, claim);
      return { groundReason: claim.grounds?.groundReasons?.find(item => item.value.ground === ground)?.value.reason };
    },
    fromForm: (claim, body, req) => {
      const ground = groundForReasonOf(req, claim);
      if (!ground) {
        return;
      }
      setNested(claim, 'grounds', grounds => {
        const existing = grounds.groundReasons?.find(item => item.value.ground === ground);
        const reason: CcdCollectionItem<GroundReason> = {
          id: existing?.id ?? newItemId(),
          value: { ground, reason: text(body.groundReason) },
        };
        const order = groundsNeedingReasons(grounds);
        grounds.groundReasons = [
          ...(grounds.groundReasons ?? []).filter(item => item.value.ground !== ground),
          reason,
        ].sort((x, y) => order.indexOf(x.value.ground as OtherGround) - order.indexOf(y.value.ground as OtherGround));
      });
    },
    isAnswered: claim => groundWithoutReasonOf(claim) === undefined,
    unansweredQuery: claim => {
      const ground = groundWithoutReasonOf(claim);
      return ground ? `?ground=${ground}` : undefined;
    },
  },

  'excluded-grounds-claim': yesNoStep('grounds', 'hasExcludedGrounds', claim => claim.grounds?.hasExcludedGrounds),

  'excluded-grounds': {
    toForm: claim => ({
      excludedGrounds: claim.grounds?.excludedGrounds ?? [],
      'excludedGrounds.excludedOtherGroundDetails': claim.grounds?.excludedOtherGroundDetails,
    }),
    fromForm: (claim, body) =>
      setNested(claim, 'grounds', grounds => {
        grounds.excludedGrounds = checkedValues(body.excludedGrounds, EXCLUDED_GROUNDS);
        grounds.excludedOtherGroundDetails = grounds.excludedGrounds.includes('OTHER')
          ? text(body['excludedGrounds.excludedOtherGroundDetails'])
          : undefined;
      }),
    isAnswered: claim => Boolean(claim.grounds?.excludedGrounds?.length),
  },

  'excluded-reason': {
    toForm: claim => ({ excludedReason: claim.grounds?.excludedReason }),
    fromForm: (claim, body) =>
      setNested(claim, 'grounds', grounds => {
        grounds.excludedReason = text(body.excludedReason);
      }),
    isAnswered: claim => Boolean(claim.grounds?.excludedReason),
  },

  'notice-served': withReason('notice', 'noticeServed', 'noNoticeReason', 'no'),

  'notice-type': {
    toForm: claim => ({
      noticeType: claim.notice?.noticeType,
      'noticeType.noticeTypeOther': claim.notice?.noticeTypeOther,
    }),
    fromForm: (claim, body) =>
      setNested(claim, 'notice', notice => {
        notice.noticeType = oneOf(body.noticeType, NOTICE_TYPES);
        notice.noticeTypeOther = notice.noticeType === 'OTHER' ? text(body['noticeType.noticeTypeOther']) : undefined;
      }),
    isAnswered: claim => claim.notice?.noticeType !== undefined,
  },

  'notice-method': {
    toForm: claim => {
      const notice = claim.notice ?? {};
      const form: FormBody = { noticeMethods: notice.noticeMethods ?? [] };
      for (const { date, details } of Object.values(NOTICE_METHOD_DETAILS)) {
        form[`noticeMethods.${date}`] = toDateParts(notice[date as NoticeDetailKey]);
        if (details) {
          form[`noticeMethods.${details}`] = notice[details as NoticeDetailKey];
        }
      }
      return form;
    },
    fromForm: (claim, body) =>
      setNested(claim, 'notice', notice => {
        const methods = checkedValues(body.noticeMethods, NOTICE_METHODS);
        notice.noticeMethods = methods;
        const writable = notice as Record<string, string | undefined>;
        for (const [method, { date, details }] of Object.entries(NOTICE_METHOD_DETAILS)) {
          const chosen = methods.includes(method as NoticeMethod);
          writable[date] = chosen ? readDate(body, `noticeMethods.${date}`) : undefined;
          if (details) {
            writable[details] = chosen ? text(body[`noticeMethods.${details}`]) : undefined;
          }
        }
      }),
    isAnswered: claim => Boolean(claim.notice?.noticeMethods?.length),
  },

  'notice-available': withReason('notice', 'noticeAvailable', 'noticeUnavailableReason', 'no'),

  'upload-notice': {
    isAnswered: claim => documentsAnswered(claim.notice?.noticeDocuments),
  },

  'rent-amount': {
    ...moneyStep('rentAmount'),
    fromForm: (claim, body, req) =>
      changeRent(claim, req, () =>
        setNested(claim, 'rentArrears', rentArrears => {
          rentArrears.rentAmount = readPence(body.rentAmount);
        })
      ),
  },

  'rent-frequency': {
    toForm: claim => ({
      rentFrequency: claim.rentArrears?.rentFrequency,
      'rentFrequency.otherFrequencyDetails': claim.rentArrears?.otherFrequencyDetails,
    }),
    fromForm: (claim, body, req) =>
      changeRent(claim, req, () =>
        setNested(claim, 'rentArrears', rentArrears => {
          rentArrears.rentFrequency = oneOf(body.rentFrequency, RENT_FREQUENCIES);
          rentArrears.otherFrequencyDetails =
            rentArrears.rentFrequency === 'OTHER' ? text(body['rentFrequency.otherFrequencyDetails']) : undefined;
        })
      ),
    isAnswered: claim => claim.rentArrears?.rentFrequency !== undefined,
  },

  'rent-due-day': {
    toForm: claim => ({ rentDueDay: claim.rentArrears?.rentDueDay?.toString() }),
    fromForm: (claim, body, req) =>
      changeRent(claim, req, () =>
        setNested(claim, 'rentArrears', rentArrears => {
          const day = text(body.rentDueDay);
          rentArrears.rentDueDay =
            day === undefined ? undefined : /^\d{1,2}$/.test(day) ? Number(day) : (UNREADABLE as unknown as number);
        })
      ),
    isAnswered: claim => claim.rentArrears?.rentDueDay !== undefined,
  },

  'arrears-at-notice': moneyStep('arrearsAtNoticeDate'),

  'current-arrears': {
    ...moneyStep('currentArrears'),
    fromForm: (claim, body) =>
      setNested(claim, 'rentArrears', rentArrears => {
        rentArrears.currentArrears = readPence(body.currentArrears);
        rentArrears.currentArrearsDate = todayInLondon();
      }),
  },

  'arrears-proof': {
    toForm: claim => ({ proofType: claim.rentArrears?.proofType }),
    fromForm: (claim, body, req) =>
      setNested(claim, 'rentArrears', rentArrears => {
        rentArrears.proofType = oneOf(body.proofType, offeredProofTypes(req));
      }),
    isAnswered: (claim, req) => {
      const proofType = claim.rentArrears?.proofType;
      return proofType !== undefined && offeredProofTypes(req).includes(proofType);
    },
  },

  'upload-rent-statement': {
    isAnswered: claim => documentsAnswered(claim.rentArrears?.rentStatementDocuments),
  },

  'statement-period': {
    toForm: (claim, req) => {
      const range = rentStatementRange(claim, req);
      return { statementStart: toDateParts(range?.statementStart), statementEnd: toDateParts(range?.statementEnd) };
    },
    fromForm: (claim, body, req) => {
      const statementStart = dateFromBody(body, 'statementStart');
      const statementEnd = dateFromBody(body, 'statementEnd');
      if (!statementStart || !statementEnd || statementEnd < statementStart) {
        return;
      }
      const { rentAmount, rentFrequency, rentDueDay } = claim.rentArrears ?? {};
      if (rentAmount && rentFrequency) {
        const generated = rentPeriodsWithinLimit({
          rentAmount,
          rentFrequency,
          rentDueDay,
          statementStart,
          statementEnd,
        });
        if (!generated) {
          return;
        }
        setNested(claim, 'rentArrears', rentArrears => {
          rentArrears.rentHistoryTable = mergeRentPeriods(generated, rentArrears.rentHistoryTable);
        });
      }
      rememberStatementPeriod(req, { statementStart, statementEnd });
    },
    isAnswered: claim => Boolean(claim.rentArrears?.rentHistoryTable?.length),
  },

  'rent-statement': {
    isAnswered: claim => Boolean(claim.rentArrears?.rentHistoryTable?.length),
  },

  'rent-statement-payment': {
    toForm: (claim, req) => {
      const row = claim.rentArrears?.rentHistoryTable?.[rentStatementRowOf(req, claim) ?? -1]?.value;
      return row ? { datePaid: toDateParts(row.datePaid), amountPaid: penceToPounds(row.amountPaid) } : {};
    },
    fromForm: (claim, body, req) => {
      const rowIndex = rentStatementRowOf(req, claim);
      if (rowIndex !== undefined && body.removePayment === 'yes') {
        if (claim.rentArrears?.rentHistoryTable?.[rowIndex]?.value.amountPaid) {
          setNested(claim, 'rentArrears', rentArrears => {
            rentArrears.rentHistoryTable = removeRentTablePayment(rentArrears.rentHistoryTable ?? [], rowIndex);
          });
        }
        return;
      }
      const datePaid = dateFromBody(body, 'datePaid');
      const amountPaid = strictPoundsToPence(body.amountPaid);
      if (!datePaid || !amountPaid) {
        return;
      }
      setNested(claim, 'rentArrears', rentArrears => {
        const rows = rentArrears.rentHistoryTable ?? [];
        if (rowIndex !== undefined) {
          rentArrears.rentHistoryTable = rows.map((row, i) =>
            i === rowIndex ? { ...row, value: { ...row.value, datePaid, amountPaid } } : row
          );
          return;
        }
        const periodStart = rentStatementPeriodOf(req, claim);
        if (periodStart) {
          rentArrears.rentHistoryTable = addRentTablePayment(rows, periodStart, { datePaid, amountPaid });
        }
      });
    },
  },

  'money-judgment': yesNoStep('rentArrears', 'moneyJudgmentWanted', claim => claim.rentArrears?.moneyJudgmentWanted),

  'recovery-steps': {
    toForm: claim => ({ recoverySteps: claim.rentArrears?.recoverySteps }),
    fromForm: (claim, body) =>
      setNested(claim, 'rentArrears', rentArrears => {
        rentArrears.recoverySteps = optionalText(body.recoverySteps, body);
      }),
    isAnswered: claim => claim.rentArrears?.recoverySteps !== undefined,
  },

  'defendant-circumstances': {
    toForm: claim => ({ defendantCircumstances: claim.circumstances?.defendantCircumstances }),
    fromForm: (claim, body) =>
      setNested(claim, 'circumstances', circumstances => {
        circumstances.defendantCircumstances = optionalText(body.defendantCircumstances, body);
      }),
    isAnswered: claim => claim.circumstances?.defendantCircumstances !== undefined,
  },

  'claimant-circumstances': {
    toForm: claim => ({ claimantCircumstances: claim.circumstances?.claimantCircumstances }),
    fromForm: (claim, body) =>
      setNested(claim, 'circumstances', circumstances => {
        circumstances.claimantCircumstances = optionalText(body.claimantCircumstances, body);
      }),
    isAnswered: claim => claim.circumstances?.claimantCircumstances !== undefined,
  },

  'upload-other-documents': {
    fromForm: (claim, body) => {
      if (!isSaveForLater(body)) {
        setNested(claim, 'otherInformation', otherInformation => {
          otherInformation.otherDocuments = otherInformation.otherDocuments ?? [];
        });
      }
    },
    isAnswered: claim => Array.isArray(claim.otherInformation?.otherDocuments),
  },

  'other-reasons': {
    toForm: claim => ({
      hasOtherReasons: fromYesNo(claim.otherInformation?.hasOtherReasons),
      'hasOtherReasons.otherReasonsDetail': claim.otherInformation?.otherReasonsDetail,
    }),
    fromForm: (claim, body) =>
      setNested(claim, 'otherInformation', otherInformation => {
        otherInformation.hasOtherReasons = toYesNo(body.hasOtherReasons);
        otherInformation.otherReasonsDetail =
          otherInformation.hasOtherReasons === 'YES' ? text(body['hasOtherReasons.otherReasonsDetail']) : undefined;
      }),
    isAnswered: claim => claim.otherInformation?.hasOtherReasons !== undefined,
  },

  'general-application': yesNoStep(
    'otherInformation',
    'generalApplicationIntent',
    claim => claim.otherInformation?.generalApplicationIntent
  ),

  'language-used': {
    toForm: claim => ({ languageUsed: claim.otherInformation?.languageUsed }),
    fromForm: (claim, body) =>
      setNested(claim, 'otherInformation', otherInformation => {
        otherInformation.languageUsed = oneOf(body.languageUsed, LANGUAGES);
      }),
    isAnswered: claim => claim.otherInformation?.languageUsed !== undefined,
  },

  'remove-defendant': {
    fromForm: (claim, body, req) => {
      const index = itemIndexOf(req, claim.defendants, 'index');
      if (body.confirmRemove === 'yes' && index !== undefined) {
        removeDefendant(claim, index);
      }
    },
  },

  'check-your-answers': {
    toForm: claim => ({
      statementOfTruth: claim.submission?.statementOfTruthAgreed === 'YES' ? ['contempt', 'belief'] : [],
      statementOfTruthFullName: claim.submission?.statementOfTruthFullName,
      statementOfTruthPosition: claim.submission?.statementOfTruthPosition,
    }),
    fromForm: (claim, body) =>
      setNested(claim, 'submission', submission => {
        const agreed = checkedValues(body.statementOfTruth, ['contempt', 'belief'] as const);
        submission.statementOfTruthAgreed = agreed.length === 2 ? 'YES' : undefined;
        submission.statementOfTruthFullName = text(body.statementOfTruthFullName);
        submission.statementOfTruthPosition = text(body.statementOfTruthPosition);
      }),
    isAnswered: claim => claim.submission?.statementOfTruthAgreed === 'YES',
  },
};

/** The rent period a payment page adds to: ?period=yyyy-MM-dd, when it is one of the statement's periods. */
export function rentStatementPeriodOf(req: Request, claim: CitizenPossessionClaim): string | undefined {
  const period = Array.isArray(req.query?.period) ? req.query.period[0] : req.query?.period;
  const rows = claim.rentArrears?.rentHistoryTable ?? [];
  return typeof period === 'string' && rows.some(row => row.value.periodStart === period) ? period : undefined;
}

/** The rent statement row a payment page changes: ?row=n, when the statement has that row. */
export function rentStatementRowOf(req: Request, claim: CitizenPossessionClaim): number | undefined {
  const index = indexFromQuery(req.query?.row);
  return index !== undefined && claim.rentArrears?.rentHistoryTable?.[index] ? index : undefined;
}

/** The period a payment page is for, from ?row= or ?period=, or undefined when the statement does not have it. */
export function rentPaymentPeriodOf(req: Request, claim: CitizenPossessionClaim): RentTableRow | undefined {
  const rows = claim.rentArrears?.rentHistoryTable ?? [];
  const rowIndex = rentStatementRowOf(req, claim);
  const periodStart =
    req.query?.row !== undefined
      ? rowIndex !== undefined
        ? rows[rowIndex].value.periodStart
        : undefined
      : rentStatementPeriodOf(req, claim);
  return periodStart
    ? rows.find(row => row.value.periodStart === periodStart && row.value.amountDue)?.value
    : undefined;
}

/** The `?problem=` the rent statement is sent back with when a payment page names a period it does not have. */
export const PERIOD_NOT_FOUND = 'periodNotFound';

/**
 * The dates a payment in a period must fall between: from when its rent was due to the period's last day. The first
 * period has no earliest date and the last no latest, since mergeRentPeriods lays out under them the payments made
 * before the statement's rent was first due and after its last rent period.
 */
export function paymentDateLimitsOf(
  req: Request,
  claim: CitizenPossessionClaim
): { earliest?: string; latest?: string } {
  const period = rentPaymentPeriodOf(req, claim);
  if (!period) {
    return {};
  }
  const periodStarts = (claim.rentArrears?.rentHistoryTable ?? [])
    .filter(row => row.value.amountDue)
    .map(row => row.value.periodStart ?? '')
    .sort();
  const isFirst = period.periodStart === periodStarts[0];
  const isLast = period.periodStart === periodStarts[periodStarts.length - 1];
  return {
    ...(isFirst ? {} : { earliest: period.dateDue }),
    ...(isLast ? {} : { latest: rentPeriodEnd(period.periodStart, claim.rentArrears ?? {}) }),
  };
}

/** The ground a reason page is about: ?ground=, or the first that needs a reason. */
export function groundForReasonOf(req: Request, claim: CitizenPossessionClaim): OtherGround | undefined {
  const grounds = groundsNeedingReasons(claim.grounds);
  const asked = Array.isArray(req.query?.ground) ? req.query.ground[0] : req.query?.ground;
  return grounds.find(ground => ground === asked) ?? (asked === undefined ? grounds[0] : undefined);
}

/** The first chosen ground that needs a reason and has none yet. */
export function groundWithoutReasonOf(claim: CitizenPossessionClaim): OtherGround | undefined {
  return groundsNeedingReasons(claim.grounds).find(
    ground => !claim.grounds?.groundReasons?.some(item => item.value.ground === ground && item.value.reason)
  );
}

/** A new collection item's id, which pcs-api keeps, so a page can name the item rather than its position. */
export function newItemId(): string {
  return randomUUID();
}

/**
 * The item a remove page is about: by ?id=, so repeating the request once it is gone changes nothing, or by
 * position for an item saved before it had an id.
 */
export function itemIndexOf(
  req: Request,
  items: CcdCollectionItem<unknown>[] | undefined,
  positionParam: 'index'
): number | undefined {
  const id = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
  if (typeof id === 'string') {
    const index = (items ?? []).findIndex(item => item.id === id);
    return index === -1 ? undefined : index;
  }
  const index = indexFromQuery(req.query?.[positionParam]);
  return index !== undefined && index < (items ?? []).length && !items?.[index]?.id ? index : undefined;
}

/** Removes a defendant after the first, for the defendants list's remove link. */
export function removeDefendant(claim: CitizenPossessionClaim, index: number): void {
  if (index > 0) {
    claim.defendants = (claim.defendants ?? []).filter((_, i) => i !== index);
  }
}
