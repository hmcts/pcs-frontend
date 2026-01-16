export enum CaseState {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
}

export type YesNoValue = 'Yes' | 'No' | null;

export interface CcdUserCase {
  id: string;
  state: CaseState;
  jurisdiction: string;
  case_type_id: string;
  case_data: UserJourneyCaseData;
}

export interface CcdUserCases {
  total: number;
  cases: CcdUserCase[];
}

export interface CcdCase {
  id: string;
  data: UserJourneyCaseData;
}

export interface DefendantResponse {
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  town: string;
  county: string;
  postcode: string;
  country: string;
}

export interface StartCallbackData {
  case_details: {
    case_data: {
      possessionClaimResponse?: {
        party?: {
          address?: {
            AddressLine1?: string,
            AddressLine2?: string,
            AddressLine3?: string,
            PostTown?: string,
            County?: string,
            PostCode?: string,
            Country?: string,
          }
        };
      };
    };
  };
};

export interface UserJourneyFormDataMap {
  'enter-user-details'?: {
    applicantForename: string;
    applicantSurname: string;
  };
  'enter-address'?: {
    addressLine1: string;
    addressLine2: string;
    addressLine3: string;
    town: string;
    county: string;
    postcode: string;
    country: string;
  };
}

export interface UserJourneyCaseData {
  applicantForename?: string;
  applicantSurname?: string;
  userPcqId?: string;
  userPcqIdSet?: YesNoValue;
  propertyAddress?: {
    AddressLine1: string;
    AddressLine2: string;
    AddressLine3: string;
    PostTown: string;
    County: string;
    PostCode: string;
    Country: string;
  };
}
