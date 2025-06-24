import { Logger } from '@hmcts/nodejs-logging';
import axios from 'axios';
import config from 'config';

const logger = Logger.getLogger('osPostcodeLookupService');
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

function getBaseUrl(): string {
  return config.get('osPostcodeLookup.url');
}

function getToken(): string {
  return config.get<string>('secrets.pcs.pcs-os-client-lookup-key');
}

export const getAddressesByPostcode = async (postcode: string): Promise<Address[]> => {
  const url = `${getBaseUrl()}/postcode?postcode=${encodeURIComponent(postcode)}&key=${getToken()}`;
  logger.info(`[osPostcodeLookupService] Calling getAddressesByPostcode with URL: ${url}`);
  try {
    const response = await axios.get<OSResponse>(url);
    logger.info(`[osPostcodeLookupService] Response data: ${JSON.stringify(response.data, null, 2)}`);
    if (!response.data?.results) {
      return [];
    }

    return response.data.results.map(({ DPA }) => {
      const {
        ADDRESS = '',
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
        fullAddress: ADDRESS,
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
