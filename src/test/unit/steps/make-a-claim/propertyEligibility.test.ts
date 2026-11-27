import type { Request } from 'express';

import { getPropertyEligibility } from '../../../../main/services/pcsApi/pcsApiService';
import {
  PROPERTY_COUNTRY_URL,
  PROPERTY_INELIGIBLE_URL,
  WALES_CLAIMANT_TYPE_URL,
} from '../../../../main/steps/make-a-claim/start/createClaim';
import { propertyCountry } from '../../../../main/steps/make-a-claim/start/propertyCountry';
import { propertyEligibilityRedirect } from '../../../../main/steps/make-a-claim/start/propertyEligibility';

jest.mock('../../../../main/services/pcsApi/pcsApiService', () => ({ getPropertyEligibility: jest.fn() }));
jest.mock('../../../../main/services/ccdCaseService', () => ({ ccdCaseService: {} }));

const check = getPropertyEligibility as jest.Mock;

function request(answers: Record<string, Record<string, string>> = {}): Request {
  return {
    session: {
      user: { accessToken: 'token' },
      formData: {
        makeAClaim: { default: { 'property-address': { 'property-postcode': 'lu1 1ab' }, ...answers } },
      },
    },
    res: { locals: { step: { name: 'property-address', journey: 'makeAClaim' } } },
  } as unknown as Request;
}

describe('propertyEligibilityRedirect', () => {
  beforeEach(() => check.mockReset());

  it.each([
    [{ status: 'ELIGIBLE', legislativeCountry: 'England' }, undefined],
    [{ status: 'ELIGIBLE', legislativeCountry: 'Wales' }, WALES_CLAIMANT_TYPE_URL],
    [{ status: 'NOT_ENGLAND_OR_WALES' }, PROPERTY_INELIGIBLE_URL],
    [{ status: 'NO_COURT' }, PROPERTY_INELIGIBLE_URL],
    [{ status: 'LEGISLATIVE_COUNTRY_REQUIRED' }, PROPERTY_COUNTRY_URL],
  ])('sends a property pcs-api finds %o to %s', async (eligibility, redirect) => {
    check.mockResolvedValue(eligibility);
    await expect(propertyEligibilityRedirect(request())).resolves.toBe(redirect);
    expect(check).toHaveBeenCalledWith('token', 'LU1 1AB', undefined);
  });

  it.each(['England', 'Wales'] as const)('remembers the property is in %s', async country => {
    const req = request();
    check.mockResolvedValue({ status: 'ELIGIBLE', legislativeCountry: country });
    await propertyEligibilityRedirect(req);
    expect(propertyCountry(req)).toBe(country);
  });

  it.each(['England', 'Wales'] as const)('checks the property in the country the claimant chose: %s', async country => {
    check.mockResolvedValue({ status: 'NOT_ENGLAND_OR_WALES' });
    await expect(propertyEligibilityRedirect(request(), country)).resolves.toBe(PROPERTY_INELIGIBLE_URL);
    expect(check).toHaveBeenCalledWith('token', 'LU1 1AB', country);
  });

  it('forgets the country an earlier address was in', async () => {
    const req = request({ 'property-eligibility': { legislativeCountry: 'Wales' } });
    check.mockResolvedValue({ status: 'NOT_ENGLAND_OR_WALES' });
    await propertyEligibilityRedirect(req);
    expect(propertyCountry(req)).toBeUndefined();
  });

  it('lets the claimant go on when the check fails, for the claim’s creation to check again', async () => {
    check.mockRejectedValue(new Error('connect ECONNREFUSED'));
    await expect(propertyEligibilityRedirect(request())).resolves.toBeUndefined();
  });

  it('checks nothing without a postcode', async () => {
    const req = request();
    delete (req.session as unknown as { formData: { makeAClaim: { default: Record<string, unknown> } } }).formData
      .makeAClaim.default['property-address'];
    await expect(propertyEligibilityRedirect(req)).resolves.toBeUndefined();
    expect(check).not.toHaveBeenCalled();
  });
});

describe('propertyCountry', () => {
  it('takes the country chosen for a cross-border postcode over the check', () => {
    const req = request({
      'property-country': { legislativeCountry: 'Wales' },
      'property-eligibility': { legislativeCountry: 'England' },
    });
    expect(propertyCountry(req)).toBe('Wales');
  });
});
