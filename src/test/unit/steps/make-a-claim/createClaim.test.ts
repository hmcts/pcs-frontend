import type { Request } from 'express';

import { CallbackRejectedError, HTTPError } from '../../../../main/HttpError';
import { ccdCaseService } from '../../../../main/services/ccdCaseService';
import {
  PROPERTY_COUNTRY_URL,
  PROPERTY_INELIGIBLE_URL,
  PROPERTY_NOT_COVERED_URL,
  createClaimFromStartAnswers,
  createdCaseReference,
  forgetCreatedClaim,
  refusedClaimRedirect,
} from '../../../../main/steps/make-a-claim/start/createClaim';

jest.mock('../../../../main/services/ccdCaseService', () => ({ ccdCaseService: { createPossessionClaim: jest.fn() } }));

const create = ccdCaseService.createPossessionClaim as jest.Mock;

function request(answers: Record<string, Record<string, unknown>>, sessionID = 'session-1'): Request {
  return {
    sessionID,
    session: { user: { accessToken: 'token' }, formData: { makeAClaim: { default: answers } } },
    params: {},
    res: { locals: { step: { name: 'who-is-claiming', journey: 'makeAClaim' } } },
  } as unknown as Request;
}

const ELIGIBLE = {
  'claimant-type': { claimantType: 'PRIVATE_LANDLORD' },
  trespass: { isTrespass: 'no' },
  'property-address': {
    'property-addressLine1': '15 Garden Drive',
    'property-town': 'Luton',
    'property-postcode': 'lu1 1ab',
  },
};

const ELIGIBILITY = { claimantType: 'PRIVATE_LANDLORD', isTrespass: 'NO', whoIsClaiming: 'MYSELF' };

describe('refusedClaimRedirect', () => {
  it.each([
    ['PROPERTY_NOT_IN_ENGLAND', PROPERTY_INELIGIBLE_URL],
    ['LEGISLATIVE_COUNTRY_REQUIRED', PROPERTY_COUNTRY_URL],
    ['POSTCODE_NOT_ASSIGNED_TO_COURT', PROPERTY_NOT_COVERED_URL],
    ['PROPERTY_NOT_ELIGIBLE', PROPERTY_NOT_COVERED_URL],
  ])('sends %s to %s', (reason, url) => {
    expect(refusedClaimRedirect(new CallbackRejectedError([reason], 422))).toBe(url);
  });

  it('finds the reason among several', () => {
    expect(refusedClaimRedirect(new CallbackRejectedError(['X', 'PROPERTY_NOT_IN_ENGLAND'], 422))).toBe(
      PROPERTY_INELIGIBLE_URL
    );
  });

  it.each([
    ['the flag-off refusal', new CallbackRejectedError(['This service is not available'], 422)],
    ['an eligibility refusal', new CallbackRejectedError(['CLAIMANT_TYPE_NOT_ELIGIBLE'], 422)],
    ['a failure', new HTTPError('CCD down', 502)],
    ['anything else', new Error('PROPERTY_NOT_IN_ENGLAND')],
  ])('has nowhere to send %s', (_case, error) => {
    expect(refusedClaimRedirect(error)).toBeUndefined();
  });
});

describe('createClaimFromStartAnswers', () => {
  beforeEach(() => create.mockReset());

  it('creates the claim with the property and eligibility answers inside the claim', async () => {
    create.mockResolvedValue({ id: 1777027600017761, data: {} });

    await expect(createClaimFromStartAnswers(request(ELIGIBLE))).resolves.toBe(
      '/case/1777027600017761/make-a-claim/eligible'
    );
    expect(create).toHaveBeenCalledWith('token', {
      citizenPossessionClaim: {
        propertyAddress: { AddressLine1: '15 Garden Drive', PostTown: 'Luton', PostCode: 'LU1 1AB' },
        eligibility: ELIGIBILITY,
      },
    });
  });

  it('says the property is in England when the claimant has said so for a cross-border postcode', async () => {
    create.mockResolvedValue({ id: 1777027600017761, data: {} });
    await createClaimFromStartAnswers(request({ ...ELIGIBLE, 'property-country': { legislativeCountry: 'England' } }));
    expect(create.mock.calls[0][1].citizenPossessionClaim.eligibility).toEqual({
      ...ELIGIBILITY,
      legislativeCountry: 'England',
    });
  });

  it('creates one claim for a double-clicked submission and continues with it after', async () => {
    let finish: (value: unknown) => void = () => undefined;
    create.mockReturnValue(new Promise(resolve => (finish = resolve)));
    const req = request(ELIGIBLE);
    const first = createClaimFromStartAnswers(req);
    const second = createClaimFromStartAnswers(req);
    finish({ id: 1777027600017761, data: {} });

    await expect(Promise.all([first, second])).resolves.toEqual([
      '/case/1777027600017761/make-a-claim/eligible',
      '/case/1777027600017761/make-a-claim/eligible',
    ]);
    await expect(createClaimFromStartAnswers(req)).resolves.toBe('/case/1777027600017761/make-a-claim/eligible');
    expect(create).toHaveBeenCalledTimes(1);
    expect(createdCaseReference(req)).toBe('1777027600017761');

    forgetCreatedClaim(req);
    expect(createdCaseReference(req)).toBeUndefined();
  });

  it('maps the not in England refusal to the property ineligible page', async () => {
    create.mockRejectedValue(new CallbackRejectedError(['PROPERTY_NOT_IN_ENGLAND'], 422));
    await expect(createClaimFromStartAnswers(request(ELIGIBLE))).resolves.toBe(PROPERTY_INELIGIBLE_URL);
  });

  it('lets any other failure through', async () => {
    create.mockRejectedValue(new HTTPError('CCD down', 502));
    await expect(createClaimFromStartAnswers(request(ELIGIBLE))).rejects.toThrow('CCD down');
  });

  it.each([
    ['not a private landlord', { ...ELIGIBLE, 'claimant-type': { claimantType: 'MORTGAGE_LENDER' } }],
    ['claiming against trespassers', { ...ELIGIBLE, trespass: { isTrespass: 'yes' } }],
    ['without a property', { ...ELIGIBLE, 'property-address': {} }],
  ])('starts again a claimant %s', async (_case, answers) => {
    await expect(createClaimFromStartAnswers(request(answers))).resolves.toBe('/make-a-claim');
    expect(create).not.toHaveBeenCalled();
  });
});
