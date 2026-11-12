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
  rentPeriodsWithinLimit,
  rowHoldsPayment,
  statementRangeOf,
} from './rentHistory';

import type { CcdCaseAddress, CcdCollectionItem } from '@services/ccdCase.interface';
import {
  type CitizenDefendant,
  type CitizenPossessionClaim,
  DISCRETIONARY_OTHER_GROUNDS,
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
  type RentLedgerEntry,
  type RentTableRow,
  type TransactionType,
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
export const NOTICE_TYPES = ['NOTICE_SEEKING_POSSESSION', 'NOTICE_TO_QUIT', 'OTHER'] as const;
export const RENT_FREQUENCIES: readonly RentFrequency[] = ['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'OTHER'];
export const PROOF_TYPES: readonly ProofType[] = ['UPLOAD_STATEMENT', 'LEDGER', 'TABLE'];
export const TRANSACTION_TYPES: readonly TransactionType[] = ['RENT_CHARGE', 'TENANT_PAYMENT'];
export const LANGUAGES = ['ENGLISH', 'WELSH', 'ENGLISH_AND_WELSH'] as const;
export const ORGANISATION_TYPES = ['INDIVIDUAL', 'ORGANISATION'] as const;

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

/** The ledger entry a transaction page edits: ?entry=n, or a new one. */
export function ledgerEntryIndexOf(req: Request, claim: CitizenPossessionClaim): number {
  const count = claim.rentArrears?.rentHistoryLedger?.length ?? 0;
  const index = indexFromQuery(req.query?.entry);
  return index !== undefined && index < count ? index : count;
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
  eligible: {
    isAnswered: claim => claim.eligibility?.isTrespass === 'NO' && claim.eligibility?.whoIsClaiming === 'MYSELF',
  },

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

  'multiple-claimants': yesNoStep('claimant', 'multipleClaimants', claim => claim.claimant?.multipleClaimants),

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

  'notice-date': {
    toForm: claim => ({ noticeDate: toDateParts(claim.notice?.noticeDate) }),
    fromForm: (claim, body) =>
      setNested(claim, 'notice', notice => {
        notice.noticeDate = readDate(body, 'noticeDate');
      }),
    isAnswered: claim => claim.notice?.noticeDate !== undefined,
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

  'ledger-transaction': {
    toForm: (claim, req) => {
      const entry = claim.rentArrears?.rentHistoryLedger?.[ledgerEntryIndexOf(req, claim)]?.value;
      if (!entry) {
        return {};
      }
      return {
        transactionDate: toDateParts(entry.transactionDate),
        transactionTypes: entry.transactionTypes ?? [],
        'transactionTypes.amountCharged': penceToPounds(entry.amountCharged),
        'transactionTypes.amountPaid': penceToPounds(entry.amountPaid),
        description: entry.description,
      };
    },
    fromForm: (claim, body, req) => {
      const index = ledgerEntryIndexOf(req, claim);
      const types = checkedValues(body.transactionTypes, TRANSACTION_TYPES);
      const entry: RentLedgerEntry = {
        transactionDate: readDate(body, 'transactionDate'),
        transactionTypes: types,
        description: text(body.description),
        amountCharged: types.includes('RENT_CHARGE') ? readPence(body['transactionTypes.amountCharged']) : undefined,
        amountPaid: types.includes('TENANT_PAYMENT') ? readPence(body['transactionTypes.amountPaid']) : undefined,
      };
      if (Object.values(entry).every(value => value === undefined || (Array.isArray(value) && value.length === 0))) {
        return;
      }
      setNested(claim, 'rentArrears', rentArrears => {
        const ledger: CcdCollectionItem<RentLedgerEntry>[] = [...(rentArrears.rentHistoryLedger ?? [])];
        ledger[index] = { id: ledger[index]?.id ?? newItemId(), value: entry };
        rentArrears.rentHistoryLedger = ledger;
      });
    },
  },

  'ledger-summary': {
    isAnswered: claim => Boolean(claim.rentArrears?.rentHistoryLedger?.length),
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
      const datePaid = dateFromBody(body, 'datePaid');
      const amountPaid = strictPoundsToPence(body.amountPaid);
      if (!datePaid || !amountPaid) {
        return;
      }
      setNested(claim, 'rentArrears', rentArrears => {
        const rows = rentArrears.rentHistoryTable ?? [];
        const rowIndex = rentStatementRowOf(req, claim);
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

  underlessee: yesNoStep('circumstances', 'underlesseeExists', claim => claim.circumstances?.underlesseeExists),

  'underlessee-name': {
    toForm: claim => ({ underlesseeName: claim.circumstances?.underlesseeName }),
    fromForm: (claim, body) =>
      setNested(claim, 'circumstances', circumstances => {
        circumstances.underlesseeName = text(body.underlesseeName);
      }),
    isAnswered: claim => Boolean(claim.circumstances?.underlesseeName),
  },

  'underlessee-address': {
    toForm: claim => addressToForm(claim.circumstances?.underlesseeAddress, 'underlessee'),
    fromForm: (claim, body) =>
      setNested(claim, 'circumstances', circumstances => {
        circumstances.underlesseeAddress = addressFromBody(body, 'underlessee');
      }),
    isAnswered: claim => Boolean(claim.circumstances?.underlesseeAddress?.AddressLine1),
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

  'remove-rent-payment': {
    fromForm: (claim, body, req) => {
      const index = rentPaymentToRemoveOf(req, claim);
      if (body.confirmRemove === 'yes' && index !== undefined) {
        setNested(claim, 'rentArrears', rentArrears => {
          rentArrears.rentHistoryTable = removeRentTablePayment(rentArrears.rentHistoryTable ?? [], index);
        });
      }
    },
  },

  'remove-ledger-entry': {
    fromForm: (claim, body, req) => {
      const index = itemIndexOf(req, claim.rentArrears?.rentHistoryLedger, 'entry');
      if (body.confirmRemove === 'yes' && index !== undefined) {
        removeLedgerEntry(claim, index);
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
 * The due date a payment for a period cannot be before, or undefined for the first period, which holds every
 * payment made before the statement's rent was first due, as mergeRentPeriods lays them out.
 */
export function paymentDueDateLimitOf(req: Request, claim: CitizenPossessionClaim): string | undefined {
  const period = rentPaymentPeriodOf(req, claim);
  const firstPeriod = (claim.rentArrears?.rentHistoryTable ?? [])
    .filter(row => row.value.amountDue)
    .map(row => row.value.periodStart ?? '')
    .sort()[0];
  return period && period.periodStart !== firstPeriod ? period.dateDue : undefined;
}

/** The payment a remove link names: ?row=n, with the date and amount it was made for, while the row still holds it. */
export function rentPaymentToRemoveOf(req: Request, claim: CitizenPossessionClaim): number | undefined {
  const index = rentStatementRowOf(req, claim);
  const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);
  const payment = { datePaid: first(req.query?.datePaid), amountPaid: first(req.query?.amountPaid) };
  return index !== undefined &&
    typeof payment.datePaid === 'string' &&
    typeof payment.amountPaid === 'string' &&
    rowHoldsPayment(claim.rentArrears?.rentHistoryTable?.[index]?.value, payment)
    ? index
    : undefined;
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
  positionParam: 'index' | 'entry'
): number | undefined {
  const id = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
  if (typeof id === 'string') {
    const index = (items ?? []).findIndex(item => item.id === id);
    return index === -1 ? undefined : index;
  }
  const index = indexFromQuery(req.query?.[positionParam]);
  return index !== undefined && index < (items ?? []).length && !items?.[index]?.id ? index : undefined;
}

/** Removes a ledger entry, for the ledger's remove link. */
export function removeLedgerEntry(claim: CitizenPossessionClaim, index: number): void {
  setNested(claim, 'rentArrears', rentArrears => {
    rentArrears.rentHistoryLedger = (rentArrears.rentHistoryLedger ?? []).filter((_, i) => i !== index);
  });
}

/** Removes a defendant after the first, for the defendants list's remove link. */
export function removeDefendant(claim: CitizenPossessionClaim, index: number): void {
  if (index > 0) {
    claim.defendants = (claim.defendants ?? []).filter((_, i) => i !== index);
  }
}
