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
  case_data: CcdCaseData;
}

export interface CcdUserCases {
  total: number;
  cases: CcdUserCase[];
}

export interface CaseDocument {
  id: string;
  value: {
    document_url: string;
    document_filename: string;
    document_binary_url: string;
  };
}

export interface CcdCaseData {
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
  tenancyLicenceDocuments?: CaseDocument[];
}

export interface CcdCase {
  id: string;
  data: CcdCaseData;
}

export interface CcdFormDataMap {
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
