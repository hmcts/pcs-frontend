import { Logger } from '@hmcts/nodejs-logging';
import axios from 'axios';
import config from 'config';

import type { Address, OSResponse } from '../interfaces/osPostcodeLookup.interface';
const logger = Logger.getLogger('osPostcodeLookupService');

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

    return response.data.results
      .map(({ DPA }) => {
        if (!DPA) {
          return null;
        }

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

        const addresses = [];

        if (ORGANISATION_NAME) {
          addresses.push(ORGANISATION_NAME);
        }

        if (SUB_BUILDING_NAME || BUILDING_NAME) {
          addresses.push([SUB_BUILDING_NAME, BUILDING_NAME].filter(Boolean).join(', ').trim());
        }

        if (BUILDING_NUMBER || THOROUGHFARE_NAME) {
          addresses.push([BUILDING_NUMBER, THOROUGHFARE_NAME].filter(Boolean).join(' ').trim());
        }

        if (DEPENDENT_THOROUGHFARE_NAME || DEPENDENT_LOCALITY || DOUBLE_DEPENDENT_LOCALITY) {
          addresses.push(
            [DEPENDENT_THOROUGHFARE_NAME, DEPENDENT_LOCALITY, DOUBLE_DEPENDENT_LOCALITY]
              .filter(Boolean)
              .join(', ')
              .trim()
          );
        }
        const [addressLine1 = '', addressLine2 = '', addressLine3 = ''] = addresses.slice(0, 3);

        return {
          fullAddress: ADDRESS,
          addressLine1,
          addressLine2,
          addressLine3,
          town: POST_TOWN,
          county: LOCAL_CUSTODIAN_CODE_DESCRIPTION,
          postcode: POSTCODE,
          country: COUNTRY_CODE_DESCRIPTION,
        };
      })
      .filter((addr): addr is Address => addr !== null);
  } catch {
    logger.error('Error fetching addresses from OS Places API');
    throw new Error('OS API error');
  }
};
