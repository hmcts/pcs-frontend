export enum CaseState {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
}

export type VerticalYesNoValue = 'YES' | 'NO' | null;
export type YesNoValue = 'Yes' | 'No';
export type TenancyTypeCorrectValue = YesNoNotSureValue;
export type ContactPreference = 'EMAIL' | 'POST' | null;

export type YesNoNotSureValue = 'YES' | 'NO' | 'NOT_SURE' | null;

export type FrequencyValue = 'WEEKLY' | 'MONTHLY';
export type PenceAmount = string;

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

export interface CcdCase {
  id: string;
  data: Record<string, unknown>;
}

export interface Address {
  AddressLine1: string;
  AddressLine2?: string;
  AddressLine3?: string;
  PostTown: string;
  County?: string;
  PostCode: string;
  Country?: string;
}

export interface HouseholdCircumstances {
  shareIncomeExpenseDetails?: YesNoValue;
  incomeFromJobs?: YesNoValue;
  incomeFromJobsAmount?: PenceAmount;
  incomeFromJobsFrequency?: FrequencyValue;
  pension?: YesNoValue;
  pensionAmount?: PenceAmount;
  pensionFrequency?: FrequencyValue;
  universalCredit?: YesNoValue;
  universalCreditAmount?: PenceAmount;
  universalCreditFrequency?: FrequencyValue;
  ucApplicationDate?: string;
  otherBenefits?: YesNoValue;
  otherBenefitsAmount?: PenceAmount;
  otherBenefitsFrequency?: FrequencyValue;
  moneyFromElsewhere?: YesNoValue;
  moneyFromElsewhereDetails?: string;
}

export interface PossessionClaimResponse {
  defendantContactDetails?: {
    party?: {
      firstName?: string;
      lastName?: string;
      address?: Address;
      phoneNumberProvided?: VerticalYesNoValue;
      phoneNumber?: string;
      emailAddress?: string;
    };
  };
  defendantResponses?: {
    tenancyTypeCorrect?: TenancyTypeCorrectValue;
    tenancyType?: string;
    tenancyStartDateCorrect?: string;
    tenancyStartDate?: string;
    contactByPhone?: VerticalYesNoValue;
    contactByText?: VerticalYesNoValue;
    preferenceType?: ContactPreference;
    rentArrearsAmountConfirmation?: string;
    rentArrearsAmount?: string;
    freeLegalAdvice?: string;
    defendantNameConfirmation?: string;
    dateOfBirth?: string;
    landlordRegistered?: YesNoNotSureValue;
    landlordLicensed?: YesNoNotSureValue;
    writtenTerms?: YesNoNotSureValue;
    householdCircumstances?: HouseholdCircumstances;
    disputeClaim?: YesNoValue;
    disputeClaimDetails?: string;

    paymentAgreement?: {
      repaymentPlanAgreed?: YesNoNotSureValue;
      repaymentAgreedDetails?: string;
    };
  };
  claimantEnteredDefendantDetails?: {
    firstName?: string;
    lastName?: string;
  };
  claimantOrganisations?: { value: string }[];
}

export interface StartCallbackData {
  case_details: {
    case_data: {
      possessionClaimResponse?: {
        defendantContactDetails?: {
          party?: {
            address?: Address;
          };
        };
      };
    };
  };
}
