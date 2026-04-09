export enum CaseState {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
}

export type YesNoValue = 'YES' | 'NO' | null;
export type TenancyTypeCorrectValue = YesNoValue | 'NOT_SURE';
export type ContactPreference = 'EMAIL' | 'POST' | null;

export type YesNoNotSureValue = 'YES' | 'NO' | 'NOT_SURE' | null;

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
  AddressLine1: string | null;
  AddressLine2?: string | null;
  AddressLine3?: string | null;
  PostTown: string | null;
  County?: string | null;
  PostCode: string | null;
  Country?: string | null;
}

export interface PossessionClaimResponse {
  defendantContactDetails?: {
    party?: {
      firstName?: string | null;
      lastName?: string | null;
      address?: Address;
      phoneNumberProvided?: YesNoValue;
      phoneNumber?: string | null;
      emailAddress?: string | null;
    };
  };
  defendantResponses?: {
    tenancyTypeCorrect?: TenancyTypeCorrectValue | null;
    tenancyType?: string | null;
    tenancyStartDateCorrect?: string | null;
    tenancyStartDate?: string | null;
    contactByPhone?: YesNoValue | null;
    contactByText?: YesNoValue | null;
    preferenceType?: ContactPreference | null;
    rentArrearsAmountConfirmation?: string | null;
    rentArrearsAmount?: string | null;
    freeLegalAdvice?: string | null;
    defendantNameConfirmation?: string | null;
    dateOfBirth?: string | null;
    landlordRegistered?: YesNoNotSureValue | null;
    landlordLicensed?: YesNoNotSureValue | null;
    writtenTerms?: YesNoNotSureValue | null;
    disputeClaim?: YesNoValue | null;
    disputeClaimDetails?: string | null;

    paymentAgreement?: {
      repaymentPlanAgreed?: YesNoNotSureValue | null;
      repaymentAgreedDetails?: string | null;
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
