import { arrayToString } from '../../utils/arrayToString';

import type { CcdCaseAddress } from '@services/ccdCase.interface';

export interface AddressFormParts {
  addressLine1: string;
  addressLine2?: string;
  townOrCity: string;
  county?: string;
  postcode: string;
}

export function buildCcdAddressFromFormParts(parts: AddressFormParts): CcdCaseAddress {
  return {
    AddressLine1: parts.addressLine1,
    ...(parts.addressLine2 !== undefined && parts.addressLine2 !== '' && { AddressLine2: parts.addressLine2 }),
    PostTown: parts.townOrCity,
    ...(parts.county !== undefined && parts.county !== '' && { County: parts.county }),
    PostCode: parts.postcode,
  };
}

export function formatCcdAddress(address: CcdCaseAddress | undefined | null): string {
  if (!address) {
    return '';
  }
  return arrayToString([
    address.AddressLine1,
    address.AddressLine2,
    address.AddressLine3,
    address.PostTown,
    address.County,
    address.PostCode,
    address.Country,
  ]);
}
