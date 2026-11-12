import type { Request } from 'express';

import { getPropertyEligibility } from '../../../../main/services/pcsApi/pcsApiService';
import {
  PROPERTY_COUNTRY_URL,
  PROPERTY_INELIGIBLE_URL,
  PROPERTY_NOT_COVERED_URL,
} from '../../../../main/steps/make-a-claim/start/createClaim';
import { propertyEligibilityRedirect } from '../../../../main/steps/make-a-claim/start/propertyEligibility';

jest.mock('../../../../main/services/pcsApi/pcsApiService', () => ({ getPropertyEligibility: jest.fn() }));
jest.mock('../../../../main/services/ccdCaseService', () => ({ ccdCaseService: {} }));

const check = getPropertyEligibility as jest.Mock;

function request(address: Record<string, string> = { 'property-postcode': 'lu1 1ab' }): Request {
  return {
    session: {
      user: { accessToken: 'token' },
      formData: { makeAClaim: { default: { 'property-address': address } } },
    },
    res: { locals: { step: { name: 'property-address', journey: 'makeAClaim' } } },
  } as unknown as Request;
}

describe('propertyEligibilityRedirect', () => {
  beforeEach(() => check.mockReset());

  it.each([
    ['ELIGIBLE', undefined],
    ['NOT_COVERED', PROPERTY_NOT_COVERED_URL],
    ['NOT_ENGLAND', PROPERTY_INELIGIBLE_URL],
    ['LEGISLATIVE_COUNTRY_REQUIRED', PROPERTY_COUNTRY_URL],
  ])('sends a property pcs-api finds %s to %s', async (status, redirect) => {
    check.mockResolvedValue(status);
    await expect(propertyEligibilityRedirect(request())).resolves.toBe(redirect);
    expect(check).toHaveBeenCalledWith('token', 'LU1 1AB', undefined);
  });

  it('asks about the property in England once the claimant has said so', async () => {
    check.mockResolvedValue('NOT_COVERED');
    await expect(propertyEligibilityRedirect(request(), 'England')).resolves.toBe(PROPERTY_NOT_COVERED_URL);
    expect(check).toHaveBeenCalledWith('token', 'LU1 1AB', 'England');
  });

  it('lets the claimant go on when the check fails, for the claim’s creation to check again', async () => {
    check.mockRejectedValue(new Error('connect ECONNREFUSED'));
    await expect(propertyEligibilityRedirect(request())).resolves.toBeUndefined();
  });

  it('checks nothing without a postcode', async () => {
    await expect(propertyEligibilityRedirect(request({}))).resolves.toBeUndefined();
    expect(check).not.toHaveBeenCalled();
  });
});
