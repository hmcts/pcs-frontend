export enum CaseState {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
}

export type YesNoValue = 'YES' | 'NO' | null;
export type ContactPreference = 'EMAIL' | 'POST' | null;

export type YesNoNotSureValue = 'YES' | 'NO' | 'NOT_SURE';

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

export interface PossessionClaimResponse {
  defendantContactDetails?: {
    party?: {
      firstName?: string;
      lastName?: string;
      address?: Address;
      phoneNumberProvided?: YesNoValue;
      phoneNumber?: string;
      emailAddress?: string;
    };
  };
  defendantResponses?: {
    tenancyStartDateCorrect?: string;
    tenancyStartDate?: string;
    contactByPhone?: YesNoValue;
    contactByText?: YesNoValue;
    preferenceType?: ContactPreference;
    freeLegalAdvice?: string;
    defendantNameConfirmation?: string;
    dateOfBirth?: string;
    landlordRegistered?: YesNoNotSureValue;
    landlordLicensed?: YesNoNotSureValue;
    householdCircumstances?: {
      alternativeAccommodation?: YesNoNotSureValue;
      alternativeAccommodationTransferDate?: string;
      otherTenants?: YesNoValue;
      otherTenantsDetails?: string;
    };
  };
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
