import type { Request } from 'express';

import { CallbackRejectedError, HTTPError } from '../../../../main/HttpError';
import { ccdCaseService } from '../../../../main/services/ccdCaseService';
import {
  PROPERTY_COUNTRY_URL,
  PROPERTY_INELIGIBLE_URL,
  PROPERTY_NOT_COVERED_URL,
  createClaimFromStartAnswers,
  refusedClaimRedirect,
  startNewAttempt,
} from '../../../../main/steps/make-a-claim/start/createClaim';

jest.mock('../../../../main/services/ccdCaseService', () => ({
  ccdCaseService: { createPossessionClaim: jest.fn(), getCaseById: jest.fn() },
}));

const create = ccdCaseService.createPossessionClaim as jest.Mock;
const getCase = ccdCaseService.getCaseById as jest.Mock;

/** The Redis commands the guard uses, against an in-memory map, shared by every request given it. */
function fakeRedis() {
  const values = new Map<string, string>();
  const expiries = new Map<string, unknown>();
  return {
    values,
    expiries,
    async set(key: string, value: string, ...options: (string | number)[]) {
      if (options.includes('NX') && values.has(key)) {
        return null;
      }
      values.set(key, value);
      expiries.set(key, options[options.indexOf('EX') + 1]);
      return 'OK';
    },
    async get(key: string) {
      return values.get(key) ?? null;
    },
    async eval(_script: string, _keys: number, key: string, token: string) {
      return values.get(key) === token && values.delete(key) ? 1 : 0;
    },
  };
}

function request(
  answers: Record<string, Record<string, unknown>>,
  sessionID = 'session-1',
  redisClient?: ReturnType<typeof fakeRedis>
): Request {
  return {
    sessionID,
    app: { locals: { redisClient } },
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

  it('sends an address pcs-api found too long back to the address page', () => {
    expect(refusedClaimRedirect(new CallbackRejectedError(['TOO_LONG:propertyAddress.AddressLine1'], 422))).toBe(
      '/make-a-claim/property-address?problem=tooLong'
    );
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
  beforeEach(() => {
    create.mockReset();
    getCase.mockReset().mockResolvedValue({ state: 'AWAITING_SUBMISSION_TO_HMCTS' });
  });

  const createdKeys = (redis: ReturnType<typeof fakeRedis>) =>
    [...redis.values.keys()].filter(key => key.startsWith('make-a-claim:created:'));

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

  it('creates one claim when the same session submits twice at once, as two pods would see it', async () => {
    let finish: (value: unknown) => void = () => undefined;
    create.mockReturnValue(new Promise(resolve => (finish = resolve)));
    const redis = fakeRedis();
    const first = createClaimFromStartAnswers(request(ELIGIBLE, 'session-1', redis));
    const second = createClaimFromStartAnswers(request(ELIGIBLE, 'session-1', redis));
    await new Promise(resolve => setTimeout(resolve, 10));
    finish({ id: 1777027600017761, data: {} });

    await expect(Promise.all([first, second])).resolves.toEqual([
      '/case/1777027600017761/make-a-claim/eligible',
      '/case/1777027600017761/make-a-claim/eligible',
    ]);
    expect(create).toHaveBeenCalledTimes(1);
    expect([...redis.values.keys()].some(key => key.startsWith('make-a-claim:creating:'))).toBe(false);
  });

  it('reuses the claim for a repeat of the same answers, even from a session saved without it', async () => {
    create.mockResolvedValue({ id: 1777027600017761, data: {} });
    const redis = fakeRedis();
    await createClaimFromStartAnswers(request(ELIGIBLE, 'session-1', redis));
    await expect(createClaimFromStartAnswers(request(ELIGIBLE, 'session-1', redis))).resolves.toBe(
      '/case/1777027600017761/make-a-claim/eligible'
    );
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('keeps what came of the answers only long enough for a double click or a concurrent repeat', async () => {
    create.mockResolvedValue({ id: 1777027600017761, data: {} });
    const redis = fakeRedis();
    await createClaimFromStartAnswers(request(ELIGIBLE, 'session-1', redis));
    expect(createdKeys(redis).map(key => redis.expiries.get(key))).toEqual([60]);
  });

  it('creates a new claim for the same answers once the first has expired from the guard', async () => {
    create
      .mockResolvedValueOnce({ id: 1777027600017761, data: {} })
      .mockResolvedValueOnce({ id: 1777027600017762, data: {} });
    const redis = fakeRedis();
    await createClaimFromStartAnswers(request(ELIGIBLE, 'session-1', redis));
    createdKeys(redis).forEach(key => redis.values.delete(key));
    await expect(createClaimFromStartAnswers(request(ELIGIBLE, 'session-1', redis))).resolves.toBe(
      '/case/1777027600017762/make-a-claim/eligible'
    );
  });

  it('creates a new claim for the same answers once the first claim is submitted', async () => {
    create
      .mockResolvedValueOnce({ id: 1777027600017761, data: {} })
      .mockResolvedValueOnce({ id: 1777027600017762, data: {} });
    const redis = fakeRedis();
    await createClaimFromStartAnswers(request(ELIGIBLE, 'session-1', redis));
    getCase.mockResolvedValue({ state: 'PENDING_CASE_ISSUED' });
    await expect(createClaimFromStartAnswers(request(ELIGIBLE, 'session-1', redis))).resolves.toBe(
      '/case/1777027600017762/make-a-claim/eligible'
    );
    expect(getCase).toHaveBeenCalledWith('token', '1777027600017761');
  });

  it('creates a new claim for the same answers given after the start page is shown again', async () => {
    create
      .mockResolvedValueOnce({ id: 1777027600017761, data: {} })
      .mockResolvedValueOnce({ id: 1777027600017762, data: {} });
    const redis = fakeRedis();
    const first = request(ELIGIBLE, 'session-1', redis);
    startNewAttempt(first);
    await createClaimFromStartAnswers(first);
    const again = request(ELIGIBLE, 'session-1', redis);
    startNewAttempt(again);
    await expect(createClaimFromStartAnswers(again)).resolves.toBe('/case/1777027600017762/make-a-claim/eligible');
  });

  it('forgets the answers once the claim is created, so the next claim asks them again', async () => {
    create.mockResolvedValue({ id: 1777027600017761, data: {} });
    const req = request({ ...ELIGIBLE, 'property-country': { legislativeCountry: 'England' } });
    await createClaimFromStartAnswers(req);
    expect(req.session.formData?.makeAClaim?.default ?? {}).toEqual({});
  });

  it('creates a new claim when the claimant answers again for another property', async () => {
    create
      .mockResolvedValueOnce({ id: 1777027600017761, data: {} })
      .mockResolvedValueOnce({ id: 1777027600017762, data: {} });
    const redis = fakeRedis();
    await createClaimFromStartAnswers(request(ELIGIBLE, 'session-1', redis));
    const elsewhere = {
      ...ELIGIBLE,
      'property-address': { ...ELIGIBLE['property-address'], 'property-addressLine1': '17 Garden Drive' },
    };
    await expect(createClaimFromStartAnswers(request(elsewhere, 'session-1', redis))).resolves.toBe(
      '/case/1777027600017762/make-a-claim/eligible'
    );
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('gives a repeated submission the refusal the first one got', async () => {
    let refuse: (error: unknown) => void = () => undefined;
    create.mockReturnValue(new Promise((_resolve, reject) => (refuse = reject)));
    const redis = fakeRedis();
    const first = createClaimFromStartAnswers(request(ELIGIBLE, 'session-1', redis));
    const second = createClaimFromStartAnswers(request(ELIGIBLE, 'session-1', redis));
    await new Promise(resolve => setTimeout(resolve, 10));
    refuse(new CallbackRejectedError(['PROPERTY_NOT_IN_ENGLAND'], 422));
    await expect(Promise.all([first, second])).resolves.toEqual([PROPERTY_INELIGIBLE_URL, PROPERTY_INELIGIBLE_URL]);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('releases only its own lock, not one another request took after it expired', async () => {
    let finish: (value: unknown) => void = () => undefined;
    create.mockReturnValue(new Promise(resolve => (finish = resolve)));
    const redis = fakeRedis();
    const first = createClaimFromStartAnswers(request(ELIGIBLE, 'session-1', redis));
    await new Promise(resolve => setTimeout(resolve, 10));
    const [lockKey] = [...redis.values.keys()].filter(key => key.startsWith('make-a-claim:creating:'));
    redis.values.set(lockKey, 'someone-else');
    finish({ id: 1777027600017761, data: {} });
    await first;
    expect(redis.values.get(lockKey)).toBe('someone-else');
  });

  it('lets another session create its own claim', async () => {
    create.mockResolvedValue({ id: 1777027600017761, data: {} });
    const redis = fakeRedis();
    await createClaimFromStartAnswers(request(ELIGIBLE, 'session-1', redis));
    await createClaimFromStartAnswers(request(ELIGIBLE, 'session-2', redis));
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('releases the lock when the creation fails', async () => {
    create.mockRejectedValue(new HTTPError('CCD down', 502));
    const redis = fakeRedis();
    await expect(createClaimFromStartAnswers(request(ELIGIBLE, 'session-1', redis))).rejects.toThrow('CCD down');
    expect([...redis.values.keys()].some(key => key.startsWith('make-a-claim:creating:'))).toBe(false);
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
