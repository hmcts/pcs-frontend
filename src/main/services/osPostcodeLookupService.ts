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

const countryCodes = new Map([
  ['E', 'ENGLAND'],
  ['S', 'SCOTLAND'],
  ['W', 'WALES'],
  ['N', 'NORTHERN IRELAND'],
]);

function toTitleCase(value: string): string {
  if (!value || !value.trim()) {
    return value;
  }
  return value
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatPostcode(value: string): string {
  return value ? value.trim().toUpperCase() : value;
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
          POSTCODE,
          COUNTRY_CODE = '',
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
        const [rawLine1 = '', rawLine2 = '', rawLine3 = ''] = addresses.slice(0, 3);

        const addr = {
          fullAddress: toTitleCase(ADDRESS),
          addressLine1: toTitleCase(rawLine1),
          addressLine2: toTitleCase(rawLine2),
          addressLine3: toTitleCase(rawLine3),
          town: toTitleCase(POST_TOWN ?? ''),
          postcode: formatPostcode(POSTCODE ?? ''),
          country: countryCodes.get(COUNTRY_CODE),
        };

        logger.info(`[osPostcodeLookupService] Address: ${JSON.stringify(addr, null, 2)}`);

        return addr;
      })
      .filter((addr): addr is Address => addr !== null);
  } catch {
    logger.error('Error fetching addresses from OS Places API');
    throw new Error('OS API error');
  }
};
