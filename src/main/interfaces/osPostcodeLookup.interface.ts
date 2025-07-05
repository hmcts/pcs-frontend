export interface OSHeader {
  uri: string;
  query: string;
  offset: number;
  totalresults: number;
  format: string;
  dataset: string;
  lr: string;
  maxresults: number;
  epoch: string;
  lastupdate: string;
  output_srs: string;
}

export interface OSResponse {
  header: OSHeader;
  results: {
    DPA: {
      ADDRESS: string;
      BUILDING_NUMBER?: string;
      SUB_BUILDING_NAME?: string;
      BUILDING_NAME?: string;
      ORGANISATION_NAME?: string;
      THOROUGHFARE_NAME?: string;
      DEPENDENT_THOROUGHFARE_NAME?: string;
      DEPENDENT_LOCALITY?: string;
      DOUBLE_DEPENDENT_LOCALITY?: string;
      POST_TOWN: string;
      LOCAL_CUSTODIAN_CODE_DESCRIPTION?: string;
      POSTCODE: string;
      COUNTRY_CODE_DESCRIPTION?: string;
    };
  }[];
}

export interface Address {
  fullAddress: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  town: string;
  county: string;
  postcode: string;
  country: string;
}
