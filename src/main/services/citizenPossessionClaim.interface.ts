import type { CcdCaseAddress, CcdCollectionItem, CcdDocumentReference } from './ccdCase.interface';
import type { CcdFlags } from './cuiRa/cuiRa.interface';

/** The private landlord's possession claim as pcs-api's `citizenPossessionClaim` field holds it. Money is pence. */
export type YesNo = 'YES' | 'NO';

export type CitizenClaimantType = 'PRIVATE_LANDLORD';

export type WhoIsClaiming = 'MYSELF' | 'SOLICITOR' | 'LITIGATION_FRIEND' | 'AGENT';

export type IndividualOrOrganisation = 'INDIVIDUAL' | 'ORGANISATION';

export type CitizenTenancyType = 'ASSURED' | 'EXCLUDED' | 'REGULATED' | 'OTHER';

/** The occupation contract or licence asked about instead of the tenancy for a property in Wales. */
export type OccupationContractType = 'STANDARD_CONTRACT' | 'SECURE_CONTRACT' | 'OTHER';

export const RENT_ARREARS_GROUNDS = ['GROUND_8', 'GROUND_10', 'GROUND_11'] as const;

export type RentArrearsGround = (typeof RENT_ARREARS_GROUNDS)[number];

export const MANDATORY_OTHER_GROUNDS = [
  'GROUND_1',
  'GROUND_1A',
  'GROUND_1B',
  'GROUND_2',
  'GROUND_2ZA',
  'GROUND_2ZB',
  'GROUND_2ZC',
  'GROUND_2ZD',
  'GROUND_4',
  'GROUND_4A',
  'GROUND_5',
  'GROUND_5A',
  'GROUND_5B',
  'GROUND_5C',
  'GROUND_5D',
  'GROUND_5E',
  'GROUND_5F',
  'GROUND_5G',
  'GROUND_5H',
  'GROUND_6',
  'GROUND_6A',
  'GROUND_6B',
  'GROUND_7',
  'GROUND_7A',
  'GROUND_7B',
] as const;

/** Grounds the claimant describes themselves, filed in their own category. */
export const OTHER_GROUND = 'OTHER';

export const DISCRETIONARY_OTHER_GROUNDS = [
  'GROUND_9',
  'GROUND_12',
  'GROUND_13',
  'GROUND_14',
  'GROUND_14A',
  'GROUND_14ZA',
  'GROUND_15',
  'GROUND_17',
  'GROUND_18',
] as const;

export type OtherGround =
  (typeof MANDATORY_OTHER_GROUNDS)[number] | (typeof DISCRETIONARY_OTHER_GROUNDS)[number] | typeof OTHER_GROUND;

/** The grounds that need no reason: the rent arrears ones, and other grounds, which have their own details. */
const GROUNDS_WITHOUT_REASON: readonly string[] = [...RENT_ARREARS_GROUNDS, OTHER_GROUND];

/** Every other ground in the order the grounds page lists them. */
const LISTED_GROUNDS: readonly string[] = [...MANDATORY_OTHER_GROUNDS, ...DISCRETIONARY_OTHER_GROUNDS, OTHER_GROUND];

/**
 * The grounds pcs-api needs a reason for, in the order the grounds page lists them, whatever order the saved
 * claim holds them in.
 */
export function groundsNeedingReasons(grounds: CitizenPossessionClaim['grounds']): OtherGround[] {
  return (grounds?.otherGrounds ?? [])
    .filter(ground => !GROUNDS_WITHOUT_REASON.includes(ground))
    .sort((a, b) => LISTED_GROUNDS.indexOf(a) - LISTED_GROUNDS.indexOf(b));
}

export type NoticeType = 'NOTICE_SEEKING_POSSESSION' | 'NOTICE_TO_QUIT' | 'OTHER';

export const NOTICE_METHODS = [
  'FIRST_CLASS_POST',
  'PERMITTED_PLACE',
  'PERSONALLY_HANDED',
  'EMAIL',
  'OTHER_ELECTRONIC',
  'OTHER',
] as const;

export type NoticeMethod = (typeof NOTICE_METHODS)[number];

/** The date and details fields under each way of serving notice. */
export const NOTICE_METHOD_DETAILS: Record<NoticeMethod, { date: string; details?: string }> = {
  FIRST_CLASS_POST: { date: 'postedDate' },
  PERMITTED_PLACE: { date: 'deliveredDate' },
  PERSONALLY_HANDED: { date: 'handedDate', details: 'handedToName' },
  EMAIL: { date: 'emailedDate', details: 'emailedTo' },
  OTHER_ELECTRONIC: { date: 'otherElectronicDate', details: 'otherElectronicDetails' },
  OTHER: { date: 'otherMethodDate', details: 'otherMethodDetails' },
};

export type RentFrequency = 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'OTHER';

export type ProofType = 'UPLOAD_STATEMENT' | 'TABLE';

/** The grounds on an excluded tenancy or licence, as pcs-api's IntroductoryDemotedOrOtherGrounds names them. */
export const EXCLUDED_GROUNDS = [
  'RENT_ARREARS',
  'ANTI_SOCIAL',
  'BREACH_OF_THE_TENANCY',
  'ABSOLUTE_GROUNDS',
  'OTHER',
] as const;

export type ExcludedGround = (typeof EXCLUDED_GROUNDS)[number];

export type EqualityQuestionsChoice = 'CONTINUE' | 'SKIP';

export type LanguageUsed = 'ENGLISH' | 'WELSH' | 'ENGLISH_AND_WELSH';

/** Documents as CCD `Document` collection items, the way pcs-api keeps them in the claim. */
export type ClaimDocuments = CcdCollectionItem<CcdDocumentReference>[];

export type LegislativeCountry = 'England' | 'Wales';

export interface CitizenDefendant {
  nameKnown?: YesNo;
  firstName?: string;
  lastName?: string;
  addressKnown?: YesNo;
  addressSameAsProperty?: YesNo;
  address?: CcdCaseAddress;
}

export interface CitizenAdditionalClaimant {
  individualOrOrganisation?: IndividualOrOrganisation;
  firstName?: string;
  lastName?: string;
  organisationName?: string;
  address?: CcdCaseAddress;
  emailAddress?: string;
  contactByPhone?: YesNo;
  phoneNumber?: string;
  contactByText?: YesNo;
  textMessageNumber?: string;
}

export interface GroundReason {
  ground?: OtherGround;
  reason?: string;
}

export interface RentTableRow {
  periodStart?: string;
  dateDue?: string;
  amountDue?: string;
  datePaid?: string;
  amountPaid?: string;
}

export interface CitizenPossessionClaim {
  draftVersion?: number;
  /** The section check your answers pages the claimant has continued from since last changing those answers. */
  confirmedSections?: string[];
  propertyAddress?: CcdCaseAddress;
  eligibility?: {
    claimantType?: CitizenClaimantType;
    isTrespass?: YesNo;
    whoIsClaiming?: WhoIsClaiming;
    legislativeCountry?: LegislativeCountry;
  };
  claimant?: {
    individualOrOrganisation?: IndividualOrOrganisation;
    firstName?: string;
    lastName?: string;
    organisationName?: string;
    address?: CcdCaseAddress;
    emailAddress?: string;
    contactByEmail?: YesNo;
    contactByPhone?: YesNo;
    phoneNumber?: string;
    contactByText?: YesNo;
    textMessageNumber?: string;
    multipleClaimants?: YesNo;
  };
  additionalClaimants?: CcdCollectionItem<CitizenAdditionalClaimant>[];
  defendants?: CcdCollectionItem<CitizenDefendant>[];
  additionalDefendants?: YesNo;
  /** Draft only: YES once the claimant has said there are no more defendants to add. */
  defendantsConfirmed?: YesNo;
  tenancy?: {
    tenancyType?: CitizenTenancyType;
    otherTenancyTypeDetails?: string;
    occupationContractType?: OccupationContractType;
    otherOccupationContractDetails?: string;
    tenancyStartDate?: string;
    tenancyAgreementAvailable?: YesNo;
    noTenancyAgreementReason?: string;
    tenancyAgreementDocuments?: ClaimDocuments;
  };
  grounds?: {
    hasRentArrearsGrounds?: YesNo;
    rentArrearsGrounds?: RentArrearsGround[];
    hasOtherGrounds?: YesNo;
    otherGrounds?: OtherGround[];
    otherGroundsDetails?: string;
    groundReasons?: CcdCollectionItem<GroundReason>[];
    hasExcludedGrounds?: YesNo;
    excludedGrounds?: ExcludedGround[];
    excludedOtherGroundDetails?: string;
    excludedReason?: string;
  };
  notice?: {
    noticeServed?: YesNo;
    noNoticeReason?: string;
    noticeType?: NoticeType;
    noticeTypeOther?: string;
    noticeMethods?: NoticeMethod[];
    postedDate?: string;
    deliveredDate?: string;
    handedToName?: string;
    handedDate?: string;
    emailedTo?: string;
    emailedDate?: string;
    otherElectronicDetails?: string;
    otherElectronicDate?: string;
    otherMethodDetails?: string;
    otherMethodDate?: string;
    noticeAvailable?: YesNo;
    noticeUnavailableReason?: string;
    noticeDocuments?: ClaimDocuments;
  };
  rentArrears?: {
    rentAmount?: string;
    rentFrequency?: RentFrequency;
    otherFrequencyDetails?: string;
    rentDueDay?: number;
    arrearsAtNoticeDate?: string;
    currentArrears?: string;
    currentArrearsDate?: string;
    proofType?: ProofType;
    rentStatementDocuments?: ClaimDocuments;
    rentHistoryTable?: CcdCollectionItem<RentTableRow>[];
    moneyJudgmentWanted?: YesNo;
    recoverySteps?: string;
  };
  circumstances?: {
    defendantCircumstances?: string;
    claimantCircumstances?: string;
  };
  otherInformation?: {
    otherDocuments?: ClaimDocuments;
    hasOtherReasons?: YesNo;
    otherReasonsDetail?: string;
    generalApplicationIntent?: YesNo;
    languageUsed?: LanguageUsed;
    supportFlags?: CcdFlags;
    equalityQuestionsChoice?: EqualityQuestionsChoice;
    pcqId?: string;
  };
  submission?: {
    statementOfTruthAgreed?: YesNo;
    statementOfTruthFullName?: string;
    statementOfTruthPosition?: string;
    serviceRequestReference?: string;
    feeAmount?: string;
    paymentStatus?: 'PAID' | 'NOT_PAID' | 'PARTIALLY_PAID';
  };
}

/** Whether the tenancy is an excluded tenancy or licence in England, whose grounds are asked separately from an assured tenancy's. */
export function isExcludedClaim(claim: CitizenPossessionClaim): boolean {
  return claim.tenancy?.tenancyType === 'EXCLUDED' && claim.eligibility?.legislativeCountry !== 'Wales';
}

/** Whether the claim is for rent arrears, which asks for the rent arrears details and proof. */
export function claimsRentArrears(claim: CitizenPossessionClaim): boolean {
  if (isExcludedClaim(claim)) {
    return (
      claim.grounds?.hasExcludedGrounds === 'YES' && Boolean(claim.grounds.excludedGrounds?.includes('RENT_ARREARS'))
    );
  }
  return claim.grounds?.hasRentArrearsGrounds === 'YES';
}
