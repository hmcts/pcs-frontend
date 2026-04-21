export enum CaseState {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
}

export type VerticalYesNoValue = 'YES' | 'NO' | null;
export type YesNoValue = 'YES' | 'NO' | null;
export type TenancyTypeCorrectValue = YesNoNotSureValue;
export type YesNoNotSureValue = 'YES' | 'NO' | 'NOT_SURE' | null;
export type ContactPreference = 'EMAIL' | 'POST' | null;
export enum YesNoEnum {
  YES = 'YES',
  NO = 'NO',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}
export type LanguageUsed = 'ENGLISH' | 'WELSH' | 'ENGLISH_AND_WELSH';

export type EqualityAndDiversityQuestionsChoice = 'CONTINUE' | 'SKIP' | null;

export interface HouseholdCircumstances {
  shareAdditionalCircumstances?: YesNoValue;
  additionalCircumstancesDetails?: string;
  exceptionalHardship?: YesNoValue;
  exceptionalHardshipDetails?: string;
  dependantChildren?: YesNoValue;
  dependantChildrenDetails?: string;
  otherDependants?: YesNoValue;
  otherDependantDetails?: string;
  alternativeAccommodation?: YesNoNotSureValue;
  alternativeAccommodationTransferDate?: string;
  otherTenants?: YesNoValue;
  otherTenantsDetails?: string;
}

export type PaymentAgreement = {
  anyPaymentsMade?: YesNoValue;
  paymentDetails?: string;
  repaymentPlanAgreed?: YesNoNotSureValue;
  repaymentAgreedDetails?: string;
  repayArrearsInstalments?: YesNoValue;
  additionalRentContribution?: unknown;
  additionalContributionFrequency?: string;
};

export interface CcdUserCase {
  id: string;
  state: CaseState;
  jurisdiction: string;
  case_type_id: string;
  case_data: Record<string, unknown>;
}

export interface CcdUserCases {
  total: number;
  cases: CcdUserCase[];
}

/** Address shape used in CCD case data (property, defendant, etc.). */
export interface CcdCaseAddress {
  AddressLine1: string;
  AddressLine2?: string;
  AddressLine3?: string;
  PostTown: string;
  County?: string;
  PostCode: string;
  Country?: string;
}

/** Single claim ground summary entry in claimGroundSummaries array. */
export interface CcdClaimGroundSummaryValue {
  category: string;
  code: string;
  label: string;
  reason?: string;
  isRentArrears: string;
}

export interface CcdClaimGroundSummaryItem {
  value: CcdClaimGroundSummaryValue;
  id: string;
}

/** Claimant organisation item in possessionClaimResponse.claimantOrganisations. */
export interface CcdClaimantOrganisation {
  value: string;
  id: string;
}

/** Claimant-entered defendant details captured when the claim was created. */
export interface CcdClaimantEnteredDefendantDetails {
  nameKnown?: YesNoValue;
  firstName?: string;
  lastName?: string;
}

/** Defendant party contact details (name/address known flags and values). */
export interface CcdDefendantParty {
  firstName?: string;
  lastName?: string;
  nameKnown?: string;
  emailAddress?: string;
  address?: CcdCaseAddress | Record<string, never>;
  addressKnown?: string;
  addressSameAsProperty?: string;
  phoneNumberProvided?: VerticalYesNoValue;
  phoneNumber?: string;
}

export interface CcdCounterClaim {
  claimSubmittedDate?: string;
  createdBy?: string;
}

/** Defendant responses (e.g. receivedFreeLegalAdvice). */
export interface CcdDefendantResponses {
  tenancyTypeCorrect?: YesNoNotSureValue;
  tenancyType?: string;
  freeLegalAdvice?: string;
  confirmNoticeGiven?: string;
  noticeDate?: string;
  tenancyStartDateCorrect?: string;
  tenancyStartDate?: string;
  defendantNameConfirmation?: string;
  dateOfBirth?: string;
  contactByPhone?: VerticalYesNoValue;
  contactByEmail?: VerticalYesNoValue;
  contactByPost?: VerticalYesNoValue;
  contactByText?: VerticalYesNoValue;
  preferenceType?: ContactPreference;
  rentArrearsAmountConfirmation?: string;
  rentArrearsAmount?: string;
  landlordRegistered?: YesNoNotSureValue;
  landlordLicensed?: YesNoNotSureValue;
  writtenTerms?: YesNoNotSureValue;
  disputeClaim?: YesNoValue;
  disputeClaimDetails?: string;
  paymentAgreement?: PaymentAgreement;
  householdCircumstances?: HouseholdCircumstances;
  possessionNoticeReceived?: YesNoNotSureValue;
  noticeReceivedDate?: string;
  languageUsed?: LanguageUsed;
  equalityAndDiversityQuestionsChoice?: EqualityAndDiversityQuestionsChoice;
  makeCounterClaim?: YesNoValue;
  counterClaim?: CcdCounterClaim;
}

export interface PossessionClaimResponse {
  claimantOrganisations?: CcdClaimantOrganisation[];
  defendantContactDetails?: {
    party?: CcdDefendantParty;
  };
  claimantEnteredDefendantDetails?: CcdClaimantEnteredDefendantDetails;
  defendantResponses?: CcdDefendantResponses;
}

export type CaseData = CcdCaseData;

/** Case data payload from CCD (START callback case_data or CcdCase.data). */
export interface CcdCaseData {
  claimIssueDate?: string;
  claimantName?: string;
  isClaimantNameCorrect?: YesNoValue;
  overriddenClaimantName?: string;
  defendantName?: string;
  defendantAddress?: string;
  rentArrears_Total?: string;
  introGrounds_IntroductoryDemotedOrOtherGrounds?: string[];
  secureGroundsWales_DiscretionaryGrounds?: string[];
  noticeServed?: string;
  propertyAddress?: CcdCaseAddress;
  claimGroundSummaries?: CcdClaimGroundSummaryItem[];
  userPcqIdSet?: string;
  tenancy_TenancyLicenceDate?: string;
  legislativeCountry?: string;
  notice_NoticeHandedOverDateTime?: string;
  notice_NoticePostedDate?: string;
  notice_NoticeOtherElectronicDateTime?: string;
  tenancy_TypeOfTenancyLicence?: string;
  tenancy_DetailsOfOtherTypeOfTenancyLicence?: string;
  occupationLicenceTypeWales?: string;
  licenceStartDate?: string;
  possessionClaimResponse?: PossessionClaimResponse;
  submitDraftAnswers?: string;
  citizenGenAppRequest?: CitizenGenAppRequest;
}

/** Case representation used by services: id + case_data. */
export interface CcdCase {
  id: string;
  data: CcdCaseData;
}

/** Links object in CCD START callback response. */
export interface CcdStartCallbackLinks {
  self: {
    href: string;
  };
}

/** case_details envelope from CCD START callback (metadata + case_data). */
export interface CcdCaseDetails {
  id: number;
  jurisdiction: string;
  state: string;
  version: number;
  case_type_id: string;
  created_date: string;
  last_modified: string;
  last_state_modified_date: string;
  security_classification: string;
  case_data: CcdCaseData;
  data_classification?: Record<string, unknown>;
  supplementary_data?: Record<string, unknown>;
  after_submit_callback_response?: unknown;
  callback_response_status_code?: unknown;
  callback_response_status?: unknown;
  delete_draft_response_status_code?: unknown;
  delete_draft_response_status?: unknown;
}

export interface StartCallbackData {
  token: string;
  _links: CcdStartCallbackLinks;
  case_details: CcdCaseDetails;
  event_id: string;
}

export enum GenAppType {
  SUSPEND,
  ADJOURN,
  SET_ASIDE,
  SOMETHING_ELSE,
}

export interface CitizenGenAppRequest {
  applicationType: GenAppType;
  within14Days?: YesNoValue;
}
