jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

const mockStartYourSupport = jest.fn();
jest.mock('@services/cuiRa/startYourSupport', () => ({
  startYourSupport: mockStartYourSupport,
}));

jest.mock('@modules/logger', () => ({
  Logger: { getLogger: () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }) },
}));

const mockIsCuiYourSupportEnabled = jest.fn();
jest.mock('@utils/isCuiYourSupportEnabled', () => ({
  isCuiYourSupportEnabled: mockIsCuiYourSupportEnabled,
}));

import type { Request } from 'express';

import { step } from '../../../../main/steps/respond-to-claim/reasonable-adjustments-triage';

const beforeRedirect = (step as unknown as { beforeRedirect: (req: Request) => Promise<void> }).beforeRedirect;
const extendGetContent = (
  step as unknown as { extendGetContent: (req: Request) => Promise<{ cuiYourSupportEnabled: boolean }> }
).extendGetContent;
const isAnswered = (step as unknown as { isAnswered: (req: Request) => unknown }).isAnswered;
const resolveRedirectAfterPost = (
  step as unknown as { resolveRedirectAfterPost: (req: Request) => Promise<string | undefined> }
).resolveRedirectAfterPost;

const buildReq = (choice: string, caseId?: string): { req: Request; redirect: jest.Mock } => {
  const redirect = jest.fn();
  const req = {
    body: { reasonableAdjustmentsChoice: choice },
    res: {
      locals: { validatedCase: caseId === undefined ? undefined : { id: caseId } },
      redirect,
    },
  } as unknown as Request;
  return { req, redirect };
};

describe('reasonable-adjustments-triage beforeRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsCuiYourSupportEnabled.mockResolvedValue(true); // feature on by default
    mockStartYourSupport.mockResolvedValue('https://cui-ra/microsite/xyz');
  });

  describe('declining support returns to the task list', () => {
    it('is a no-op on "I do not need any support" — no Your Support launch, no redirect', async () => {
      const { req, redirect } = buildReq('skip', '123');

      await beforeRedirect(req);

      // Your Support is an optional task: beforeRedirect does nothing on skip and the citizen is
      // returned to the task list by resolveRedirectAfterPost (covered below). PCQ is no longer
      // fired from here — it now fires on entry to language-used.
      expect(mockStartYourSupport).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    });
  });

  describe('continuing to the questions launches Your Support', () => {
    it('303-redirects to the microsite url', async () => {
      const { req, redirect } = buildReq('questions', '123');

      await beforeRedirect(req);

      expect(mockStartYourSupport).toHaveBeenCalledWith(req);
      expect(redirect).toHaveBeenCalledWith(303, 'https://cui-ra/microsite/xyz');
    });

    it('does not launch Your Support when the feature flag is off (falls through like skip)', async () => {
      mockIsCuiYourSupportEnabled.mockResolvedValue(false);
      const { req, redirect } = buildReq('questions', '123');

      await beforeRedirect(req);

      expect(mockStartYourSupport).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    });

    it('redirects to the RA error page when launching Your Support fails', async () => {
      mockStartYourSupport.mockRejectedValue(new Error('cui-ra down'));
      const { req, redirect } = buildReq('questions', '123');

      await beforeRedirect(req);

      expect(redirect).toHaveBeenCalledWith(303, '/case/123/respond-to-claim/reasonable-adjustments-error');
    });

    it('rethrows (never silently continues) when there is no case reference to build the error page', async () => {
      const error = new Error('cui-ra down');
      mockStartYourSupport.mockRejectedValue(error);
      const { req, redirect } = buildReq('questions', undefined);

      await expect(beforeRedirect(req)).rejects.toBe(error);
      expect(redirect).not.toHaveBeenCalled();
    });
  });
});

describe('reasonable-adjustments-triage extendGetContent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('exposes cuiYourSupportEnabled=true so the template shows the "Continue to the questions" button', async () => {
    mockIsCuiYourSupportEnabled.mockResolvedValue(true);
    const { req } = buildReq('questions', '123');

    await expect(extendGetContent(req)).resolves.toEqual({ cuiYourSupportEnabled: true });
  });

  it('exposes cuiYourSupportEnabled=false so the template hides the button when the flag is off', async () => {
    mockIsCuiYourSupportEnabled.mockResolvedValue(false);
    const { req } = buildReq('questions', '123');

    await expect(extendGetContent(req)).resolves.toEqual({ cuiYourSupportEnabled: false });
  });
});

describe('reasonable-adjustments-triage isAnswered (drives the task-list "Your support" row status)', () => {
  const reqWith = (possessionClaimResponse?: unknown): Request =>
    ({ res: { locals: { validatedCase: { id: '123', possessionClaimResponse } } } }) as unknown as Request;

  it('is truthy once the defendant has captured adjustments (defendantFlags.details present)', () => {
    const req = reqWith({ defendantFlags: { details: [{ id: 'f1', value: { name: 'Language interpreter' } }] } });

    expect(Boolean(isAnswered(req))).toBe(true);
  });

  it('is falsy when there are no defendantFlags', () => {
    expect(Boolean(isAnswered(reqWith(undefined)))).toBe(false);
    expect(Boolean(isAnswered(reqWith({})))).toBe(false);
  });

  it('is falsy when defendantFlags has an empty details list', () => {
    expect(Boolean(isAnswered(reqWith({ defendantFlags: { details: [] } })))).toBe(false);
  });
});

describe('reasonable-adjustments-triage resolveRedirectAfterPost (skip returns to the task list)', () => {
  it('returns the task-list url when a case reference is present', async () => {
    const req = { res: { locals: { validatedCase: { id: '123' } } } } as unknown as Request;

    await expect(resolveRedirectAfterPost(req)).resolves.toBe('/case/123/respond-to-claim/task-list');
  });

  it('returns undefined when there is no case reference (postHandler then falls back to flow nav)', async () => {
    const req = { res: { locals: { validatedCase: undefined } } } as unknown as Request;

    await expect(resolveRedirectAfterPost(req)).resolves.toBeUndefined();
  });
});
