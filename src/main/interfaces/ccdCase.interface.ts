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

export interface DefendantResponses {
  disputeClaim?: 'YES' | 'NO';
  disputeDetails?: string;
  oweRentArrears?: 'YES' | 'NO' | 'NOT_SURE';
  rentArrearsAmount?: string;
}

export interface PossessionClaimResponse {
  defendantContactDetails?: {
    party: {
      firstName?: string;
      lastName?: string;
      address?: Address;
    };
  };
  defendantResponses?: DefendantResponses;
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
