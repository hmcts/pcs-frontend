import type { RespondToClaimSectionEnum } from '../steps/respond-to-claim/sections.config';

export type YesNoValue = 'YES' | 'NO' | null;
export type YesNoNotSureValue = 'YES' | 'NO' | 'NOT_SURE' | null;
export enum YesNoEnum {
  YES = 'YES',
  NO = 'NO',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}
export type FrequencyValue = 'WEEKLY' | 'MONTHLY';
export enum LanguageUsed {
  ENGLISH = 'ENGLISH',
  WELSH = 'WELSH',
  ENGLISH_AND_WELSH = 'ENGLISH_AND_WELSH',
}

export type EqualityAndDiversityQuestionsChoice = 'CONTINUE' | 'SKIP' | null;

export type PenceAmount = string;

export interface IncomeExpenseDetails {
  applies?: YesNoValue;
  amount?: PenceAmount;
  frequency?: FrequencyValue;
}

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
  shareIncomeExpenseDetails?: YesNoValue;
  incomeFromJobs?: YesNoValue;
  incomeFromJobsAmount?: PenceAmount;
  incomeFromJobsFrequency?: FrequencyValue;
  pension?: YesNoValue;
  pensionAmount?: PenceAmount;
  pensionFrequency?: FrequencyValue;
  universalCredit?: YesNoValue;
  hasAppliedForUniversalCredit?: YesNoValue;
  universalCreditAmount?: PenceAmount | null;
  universalCreditFrequency?: FrequencyValue | null;
  ucApplicationDate?: string | null;
  otherBenefits?: YesNoValue;
  otherBenefitsAmount?: PenceAmount;
  otherBenefitsFrequency?: FrequencyValue;
  moneyFromElsewhere?: YesNoValue;
  moneyFromElsewhereDetails?: string;
  priorityDebts?: YesNoValue;
  debtTotal?: string;
  debtContribution?: string;
  debtContributionFrequency?: FrequencyValue;
  householdBills?: IncomeExpenseDetails;
  loanPayments?: IncomeExpenseDetails;
  childSpousalMaintenance?: IncomeExpenseDetails;
  mobilePhone?: IncomeExpenseDetails;
  groceryShopping?: IncomeExpenseDetails;
  fuelParkingTransport?: IncomeExpenseDetails;
  schoolCosts?: IncomeExpenseDetails;
  clothing?: IncomeExpenseDetails;
  otherExpenses?: IncomeExpenseDetails;
}

export type PaymentAgreement = {
  anyPaymentsMade?: YesNoValue;
  paymentDetails?: string;
  repaymentPlanAgreed?: YesNoNotSureValue;
  repaymentAgreedDetails?: string;
  repayArrearsInstalments?: YesNoValue;
  additionalRentContribution?: PenceAmount;
  additionalContributionFrequency?: string;
};

export interface CcdCaseAddress {
  AddressLine1?: string;
  AddressLine2?: string;
  AddressLine3?: string;
  PostTown?: string;
  County?: string;
  PostCode?: string;
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

export interface Party {
  id: string;
  idamId: string;
  firstName: string;
  lastName: string;
}

export interface Document {
  document_url: string;
  document_filename: string;
  document_binary_url: string;
}

export interface DocumentWithId {
  id: string;
  document: Document;
}

export interface GenApp {
  applicationType: GenAppType;
  party: Party;
  submittedOn: string;
  submissionDocument: DocumentWithId;
  supportingDocuments: CcdCollectionItem<Document>[];
}
/** Claimant organisation item in possessionClaimResponse.claimantOrganisations. */
export interface CcdClaimantOrganisation {
  value: string;
  id: string;
}

/** Parties involved in the claim  */
export interface CcdParty {
  firstName?: string;
  lastName?: string;
  orgName?: string;
}

/** Claimant-entered defendant details captured when the claim was created. */
export interface CcdClaimantEnteredDefendantDetails {
  nameKnown?: YesNoValue;
  firstName?: string;
  lastName?: string;
  address?: CcdCaseAddress | Record<string, never>;
  addressKnown?: YesNoValue;
  addressSameAsProperty?: YesNoValue;
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

/** Counter-claim data captured across the counterclaim journey screens. */
export interface CcdCounterClaim {
  needHelpWithFees?: YesNoValue;
  appliedForHwf?: YesNoValue;
  hwfReferenceNumber?: string;
  claimType?: string;
  isClaimAmountKnown?: string;
  claimAmount?: PenceAmount;
  estimatedMaxClaimAmount?: PenceAmount;
  counterClaimAgainst?: CcdCollectionItem<CcdParty>[];
  counterClaimFor?: string;
  counterClaimReasons?: string;
  otherOrderRequestDetails?: string;
  otherOrderRequestFacts?: string;
}

/** CCD SDK Document type -- flat reference with URLs. */
export interface CcdDocumentReference {
  document_url: string;
  document_binary_url: string;
  document_filename: string;
  document_hash?: string;
  category_id?: string;
  upload_timestamp?: string;
}

/** Wraps CCD Document with metadata fields (matches backend UploadedDocument). */
export interface CcdUploadedDocument {
  document: CcdDocumentReference;
  contentType?: string;
  sizeInBytes?: number;
}

export interface CcdCollectionItem<T> {
  id?: string;
  value: T;
}

export interface CcdDefendantResponses {
  correspondenceAddressConfirmation?: YesNoValue;
  tenancyTypeConfirmation?: YesNoNotSureValue;
  tenancyType?: string;
  freeLegalAdvice?: string;
  tenancyStartDateConfirmation?: YesNoNotSureValue;
  tenancyStartDate?: string;
  defendantNameConfirmation?: string;
  dateOfBirth?: string;
  contactByPhone?: YesNoValue;
  contactByEmail?: YesNoValue;
  contactByPost?: YesNoValue;
  contactByText?: YesNoValue;
  rentArrearsAmountConfirmation?: string;
  rentArrearsAmount?: string;
  landlordRegistered?: YesNoNotSureValue;
  landlordLicensed?: YesNoNotSureValue;
  writtenTerms?: YesNoNotSureValue;
  disputeClaim?: YesNoValue;
  disputeClaimDetails?: string;
  counterClaim?: CcdCounterClaim;
  paymentAgreement?: PaymentAgreement;
  householdCircumstances?: HouseholdCircumstances;
  possessionNoticeReceived?: YesNoNotSureValue;
  noticeReceivedDate?: string;
  defendantDocuments?: CcdCollectionItem<CcdUploadedDocument>[];
  counterClaimDocuments?: CcdCollectionItem<CcdUploadedDocument>[];
  languageUsed?: LanguageUsed;
  equalityAndDiversityQuestionsChoice?: EqualityAndDiversityQuestionsChoice;
  otherConsiderations?: YesNoValue;
  otherConsiderationsDetails?: string;
  makeCounterClaim?: YesNoValue;
  statementOfTruth?: StatementOfTruth;
  counterClaimWantToUploadFiles?: YesNoValue;
  completedSections?: RespondToClaimSectionEnum[];
  status?: 'SUBMITTED' | 'CREATED';
}

export interface StatementOfTruth {
  accepted?: YesNoValue;
  fullName?: string;
  nameOfFirm?: string;
  positionHeld?: string;
}

export interface PossessionClaimResponse {
  claimantOrganisations?: CcdClaimantOrganisation[];
  defendantContactDetails?: {
    party?: CcdDefendantParty;
  };
  claimantEnteredDefendantDetails?: CcdClaimantEnteredDefendantDetails;
  defendantResponses?: CcdDefendantResponses;
  currentDefendantPartyId?: string;
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
  walesNoticeServed?: string;
  propertyAddress?: CcdCaseAddress;
  claimGroundSummaries?: CcdClaimGroundSummaryItem[];
  userPcqId?: string;
  userPcqIdSet?: string;
  tenancy_TenancyLicenceDate?: string;
  legislativeCountry?: string;
  notice_NoticeHandedOverDateTime?: string;
  notice_NoticePostedDate?: string;
  notice_NoticeDeliveredDate?: string;
  notice_NoticeEmailSentDateTime?: string;
  notice_NoticeOtherElectronicDateTime?: string;
  notice_NoticeOtherDateTime?: string;
  tenancy_TypeOfTenancyLicence?: string;
  tenancy_DetailsOfOtherTypeOfTenancyLicence?: string;
  occupationLicenceTypeWales?: string;
  otherLicenceTypeDetails?: string;
  licenceStartDate?: string;
  possessionClaimResponse?: PossessionClaimResponse;
  submitDraftAnswers?: string;
  genApps?: CcdCollectionItem<GenApp>[];
  allClaimants?: CcdCollectionItem<CcdParty>[];
  allDefendants?: CcdCollectionItem<CcdParty>[];
  allLinkedDefendants?: CcdCollectionItem<CcdDefendantParty>[];
  citizenGenAppRequest?: CitizenGenAppRequest;
  // Gen-apps applicant fields written at create-case time
  applicantForename?: string;
  applicantSurname?: string;
  dashboardData?: CcdDashboardData;
  allDocuments?: CcdCollectionItem<CcdCaseDocument>[];
}

export interface CcdCaseDocument {
  document_binary_url?: string;
  document_filename?: string;
  upload_timestamp?: string;
  category_id?: string;
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

export interface CcdTemplateKeyValue {
  key: string;
  value: string;
}

export interface CcdDashboardNotification {
  templateId: string;
  templateValues: CcdCollectionItem<CcdTemplateKeyValue>[];
}

export interface CcdDashboardTask {
  templateId: string;
  status: string;
}

export interface CcdDashboardTaskGroup {
  groupId: string;
  tasks: CcdCollectionItem<CcdDashboardTask>[];
}

export interface CcdDashboardData {
  caseId?: string;
  propertyAddress?: CcdCaseAddress;
  notifications?: CcdCollectionItem<CcdDashboardNotification>[];
  taskGroups?: CcdCollectionItem<CcdDashboardTaskGroup>[];
  relatedApplications?: CcdCollectionItem<CcdRelatedApplication>[];
}

export interface CcdRelatedApplication {
  id?: string;
  type?: GenAppType;
  applicationSubmittedDate?: string;
}

export enum GenAppType {
  ADJOURN = 'ADJOURN',
  SET_ASIDE = 'SET_ASIDE',
  SOMETHING_ELSE = 'SOMETHING_ELSE',
}

export interface CitizenGenAppRequest {
  applicationType?: GenAppType;
  within14Days?: YesNoValue;
  needHwf?: YesNoValue;
  appliedForHwf?: YesNoValue;
  hwfReference?: string;
  otherPartiesAgreed?: YesNoValue;
  withoutNotice?: YesNoValue;
  withoutNoticeReason?: string;
  languageUsed?: LanguageUsed;
  whatOrderWanted?: string;
  hasSupportingDocuments?: YesNoValue;
  uploadedDocuments?: CcdCollectionItem<CcdUploadedDocument>[];
  sotAccepted?: YesNoValue;
  sotFullName?: string;
  clientReference?: string;
}

/** Claim summary returned by GET /cases/defendant-claims on pcs-api. */
export interface ClaimSummary {
  caseReference?: string;
  claimantName?: string;
  propertyPostcode?: string;
}
