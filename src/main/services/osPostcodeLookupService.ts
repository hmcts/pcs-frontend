import { Logger } from '@hmcts/nodejs-logging';
import config from 'config';

import { http } from '../modules/http';

const logger = Logger.getLogger('postcodeLookupService');
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
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  town: string;
  county: string;
  postcode: string;
  country: string;
}

function getBaseUrl(): string {
  return config.get('osPostcodeLookup.url');
}

function getToken(): string {
  return config.get('osPostcodeLookup.token');
}

export const getAddressesByPostcode = async (postcode: string): Promise<Address[]> => {
  const url = `${getBaseUrl()}/postcode?postcode=${encodeURIComponent(postcode)}&key=${getToken()}`;
  try {
    const response = await http.get<OSResponse>(url);

    if (!response.data?.results) {
      return [];
    }

    return response.data.results.map(({ DPA }) => {
      const {
        BUILDING_NUMBER = '',
        SUB_BUILDING_NAME = '',
        BUILDING_NAME = '',
        ORGANISATION_NAME = '',
        THOROUGHFARE_NAME = '',
        DEPENDENT_THOROUGHFARE_NAME = '',
        DEPENDENT_LOCALITY = '',
        DOUBLE_DEPENDENT_LOCALITY = '',
        POST_TOWN,
        LOCAL_CUSTODIAN_CODE_DESCRIPTION = '',
        POSTCODE,
        COUNTRY_CODE_DESCRIPTION = '',
      } = DPA;

      return {
        addressLine1: [BUILDING_NUMBER, THOROUGHFARE_NAME].filter(Boolean).join(' ').trim(),
        addressLine2: [SUB_BUILDING_NAME, BUILDING_NAME].filter(Boolean).join(', ').trim(),
        addressLine3: [ORGANISATION_NAME, DEPENDENT_THOROUGHFARE_NAME, DEPENDENT_LOCALITY, DOUBLE_DEPENDENT_LOCALITY]
          .filter(Boolean)
          .join(', ')
          .trim(),
        town: POST_TOWN,
        county: LOCAL_CUSTODIAN_CODE_DESCRIPTION,
        postcode: POSTCODE,
        country: COUNTRY_CODE_DESCRIPTION,
      };
    });
  } catch (err) {
    logger.error('Error fetching addresses from OS Places API', err);
    return [];
  }
};
