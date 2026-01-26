import { Injectable, BadRequestException, BadGatewayException } from '@nestjs/common';
import { Logger } from '@hmcts/nodejs-logging';
import axios from 'axios';
import config from 'config';

import type { Address, OSResponse } from '../../interfaces/osPostcodeLookup.interface';

@Injectable()
export class PostcodeService {
  private readonly logger = Logger.getLogger('PostcodeService');

  private readonly countryCodes = new Map([
    ['E', 'ENGLAND'],
    ['S', 'SCOTLAND'],
    ['W', 'WALES'],
    ['N', 'NORTHERN IRELAND'],
  ]);

  private getBaseUrl(): string {
    return config.get('osPostcodeLookup.url');
  }

  private getToken(): string {
    return config.get<string>('secrets.pcs.pcs-os-client-lookup-key');
  }

  async getAddressesByPostcode(postcode: string): Promise<Address[]> {
    if (!postcode || postcode.trim() === '') {
      throw new BadRequestException('Missing postcode');
    }

    const trimmedPostcode = postcode.trim();
    const url = `${this.getBaseUrl()}/postcode?postcode=${encodeURIComponent(trimmedPostcode)}&key=${this.getToken()}`;

    this.logger.info(`[PostcodeService] Calling getAddressesByPostcode for postcode: ${trimmedPostcode}`);

    try {
      const response = await axios.get<OSResponse>(url);

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

          const addresses: string[] = [];

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
            county: '',
            postcode: POSTCODE,
            country: this.countryCodes.get(COUNTRY_CODE) || '',
          } as Address;
        })
        .filter((addr): addr is Address => addr !== null);
    } catch (error) {
      this.logger.error('Error fetching addresses from OS Places API', error);
      throw new BadGatewayException('Failed to lookup postcode');
    }
  }
}
