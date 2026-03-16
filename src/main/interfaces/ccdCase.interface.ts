export enum CaseState {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
}

export type YesNoValue = 'YES' | 'NO' | null;
export type YesNoNotSureValue = 'YES' | 'NO' | 'NOT_SURE';
export enum YesNoEnum {
  YES = 'YES',
  NO = 'NO',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

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

/** Defendant party contact details (name/address known flags and values). */
export interface CcdDefendantParty {
  firstName?: string;
  lastName?: string;
  nameKnown?: string;
  emailAddress?: string;
  address?: CcdCaseAddress | Record<string, never>;
  addressKnown?: string;
  addressSameAsProperty?: string;
  phoneNumberProvided?: YesNoValue;
  phoneNumber?: string;
}

/** Defendant responses (e.g. receivedFreeLegalAdvice). */
export interface CcdDefendantResponses {
  receivedFreeLegalAdvice?: string;
  confirmNoticeGiven?: string;
  tenancyStartDateCorrect?: string;
  tenancyStartDate?: string;
  contactByPhone?: YesNoValue;
  contactByEmail?: YesNoValue;
  contactByPost?: YesNoValue;
  contactByText?: YesNoValue;
  landlordRegistered?: YesNoNotSureValue;
}

export interface PossessionClaimResponse {
  claimantOrganisations?: CcdClaimantOrganisation[];
  defendantContactDetails?: {
    party?: CcdDefendantParty;
  };
  defendantResponses?: CcdDefendantResponses;
}

/** Case data payload from CCD (START callback case_data or CcdCase.data). */
export interface CcdCaseData {
  claimIssueDate?: string;
  defendantName?: string;
  defendantAddress?: string;
  rentArrears_Total?: string;
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
  occupationLicenceTypeWales?: string;
  licenceStartDate?: string;
  possessionClaimResponse?: PossessionClaimResponse;
  submitDraftAnswers?: string;
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
