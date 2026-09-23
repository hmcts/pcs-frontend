jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

const mockStartYourSupport = jest.fn();
jest.mock('@services/cuiRa/startYourSupport', () => ({
  startYourSupport: mockStartYourSupport,
}));

const mockBuildDraftDefendantResponse = jest.fn();
const mockSaveDraftDefendantResponse = jest.fn();
jest.mock('../../../../main/steps/utils/buildDraftDefendantResponse', () => ({
  buildDraftDefendantResponse: mockBuildDraftDefendantResponse,
  saveDraftDefendantResponse: mockSaveDraftDefendantResponse,
}));

jest.mock('@modules/logger', () => ({
  Logger: { getLogger: () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }) },
}));

const mockIsCuiYourSupportEnabled = jest.fn();
jest.mock('@utils/isCuiYourSupportEnabled', () => ({
  isCuiYourSupportEnabled: mockIsCuiYourSupportEnabled,
}));

jest.mock('@routes/dashboard', () => ({
  getDashboardUrl: jest.fn((caseReference?: string) => (caseReference ? `/case/${caseReference}/dashboard` : null)),
}));

import type { Request } from 'express';

import { step } from '../../../../main/steps/respond-to-claim/reasonable-adjustments-triage';

const beforeRedirect = (step as unknown as { beforeRedirect: (req: Request) => Promise<void> }).beforeRedirect;
const beforeGet = (step as unknown as { beforeGet: (req: Request) => Promise<void> }).beforeGet;
const extendGetContent = (
  step as unknown as {
    extendGetContent: (req: Request) => Promise<{ cuiYourSupportEnabled: boolean; backUrl?: string }>;
  }
).extendGetContent;
const isAnswered = (step as unknown as { isAnswered: (req: Request) => unknown }).isAnswered;
const resolveRedirectAfterPost = (
  step as unknown as { resolveRedirectAfterPost: (req: Request) => Promise<string | undefined> }
).resolveRedirectAfterPost;

const buildReq = (
  choice: string,
  caseId?: string,
  validatedCase?: unknown,
  extras: { session?: Record<string, unknown>; query?: Record<string, unknown> } = {}
): { req: Request; redirect: jest.Mock } => {
  const redirect = jest.fn();
  const req = {
    body: { reasonableAdjustmentsChoice: choice },
    query: extras.query ?? {},
    session: extras.session ?? {},
    res: {
      locals: { validatedCase: validatedCase ?? (caseId === undefined ? undefined : { id: caseId }) },
      redirect,
    },
  } as unknown as Request;
  return { req, redirect };
};

const submittedCase = {
  id: '123',
  data: { possessionClaimResponse: { defendantResponses: { status: 'SUBMITTED' } } },
};

describe('reasonable-adjustments-triage beforeRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsCuiYourSupportEnabled.mockResolvedValue(true); // feature on by default
    mockStartYourSupport.mockResolvedValue('https://cui-ra/microsite/xyz');
    mockBuildDraftDefendantResponse.mockReturnValue({
      defendantContactDetails: { party: {} },
      defendantResponses: {},
    });
  });

  describe('declining support returns to the task list', () => {
    it('records "no support needed" on the draft (YOUR_SUPPORT in completedSections) without launching Your Support', async () => {
      mockBuildDraftDefendantResponse.mockReturnValue({
        defendantContactDetails: { party: {} },
        defendantResponses: { completedSections: ['PERSONAL_DETAILS'] },
      });
      const { req, redirect } = buildReq('skip', '123');

      await beforeRedirect(req);

      // The citizen is returned to the task list by resolveRedirectAfterPost (covered below); the draft
      // write is what turns the "Your support" row Done.
      expect(mockSaveDraftDefendantResponse).toHaveBeenCalledWith(
        req,
        expect.objectContaining({
          defendantResponses: { completedSections: ['PERSONAL_DETAILS', 'YOUR_SUPPORT'] },
        })
      );
      expect(mockStartYourSupport).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    });

    it('does not duplicate the marker when Your Support is already complete', async () => {
      mockBuildDraftDefendantResponse.mockReturnValue({
        defendantContactDetails: { party: {} },
        defendantResponses: { completedSections: ['YOUR_SUPPORT'] },
      });
      const { req } = buildReq('skip', '123');

      await beforeRedirect(req);

      expect(mockSaveDraftDefendantResponse).toHaveBeenCalledWith(
        req,
        expect.objectContaining({ defendantResponses: { completedSections: ['YOUR_SUPPORT'] } })
      );
    });

    it('writes nothing once the response has been submitted (there is no draft any more)', async () => {
      const { req, redirect } = buildReq('skip', undefined, submittedCase);

      await beforeRedirect(req);

      expect(mockBuildDraftDefendantResponse).not.toHaveBeenCalled();
      expect(mockSaveDraftDefendantResponse).not.toHaveBeenCalled();
      expect(mockStartYourSupport).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    });

    it('propagates a failed draft save so the citizen sees an error rather than a false Done', async () => {
      mockSaveDraftDefendantResponse.mockRejectedValueOnce(new Error('ccd down'));
      const { req } = buildReq('skip', '123');

      await expect(beforeRedirect(req)).rejects.toThrow('ccd down');
    });
  });

  describe('continuing to the questions launches Your Support', () => {
    it('303-redirects to the microsite url without touching the draft', async () => {
      const { req, redirect } = buildReq('questions', '123');

      await beforeRedirect(req);

      expect(mockStartYourSupport).toHaveBeenCalledWith(req);
      expect(redirect).toHaveBeenCalledWith(303, 'https://cui-ra/microsite/xyz');
      expect(mockSaveDraftDefendantResponse).not.toHaveBeenCalled();
    });

    it('neither launches Your Support nor records an answer when the feature flag is off', async () => {
      mockIsCuiYourSupportEnabled.mockResolvedValue(false);
      const { req, redirect } = buildReq('questions', '123');

      await beforeRedirect(req);

      expect(mockStartYourSupport).not.toHaveBeenCalled();
      expect(mockSaveDraftDefendantResponse).not.toHaveBeenCalled();
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

describe('reasonable-adjustments-triage beforeGet (remembers where Your Support was launched from)', () => {
  it("records 'dashboard' against the case when reached with ?from=dashboard", async () => {
    const { req } = buildReq('questions', '123', undefined, { query: { from: 'dashboard' } });

    await beforeGet(req);

    expect(req.session.yourSupportReturnTo).toEqual({ '123': 'dashboard' });
  });

  it("records 'task-list' against the case when reached with ?from=task-list", async () => {
    const { req } = buildReq('questions', '123', undefined, { query: { from: 'task-list' } });

    await beforeGet(req);

    expect(req.session.yourSupportReturnTo).toEqual({ '123': 'task-list' });
  });

  it('leaves the recorded origin alone when from is absent, e.g. after the language toggle', async () => {
    const { req } = buildReq('questions', '123', undefined, {
      query: { lang: 'cy' },
      session: { yourSupportReturnTo: { '123': 'dashboard' } },
    });

    await beforeGet(req);

    expect(req.session.yourSupportReturnTo).toEqual({ '123': 'dashboard' });
  });
});

describe('reasonable-adjustments-triage extendGetContent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('exposes cuiYourSupportEnabled=true so the template shows the "Continue to the questions" button', async () => {
    mockIsCuiYourSupportEnabled.mockResolvedValue(true);
    const { req } = buildReq('questions', '123');

    await expect(extendGetContent(req)).resolves.toEqual({
      cuiYourSupportEnabled: true,
      backUrl: '/case/123/respond-to-claim/task-list',
    });
  });

  it('exposes cuiYourSupportEnabled=false so the template hides the button when the flag is off', async () => {
    mockIsCuiYourSupportEnabled.mockResolvedValue(false);
    const { req } = buildReq('questions', '123');

    await expect(extendGetContent(req)).resolves.toEqual({
      cuiYourSupportEnabled: false,
      backUrl: '/case/123/respond-to-claim/task-list',
    });
  });

  it('points the back link at the dashboard when Your Support was launched from there', async () => {
    mockIsCuiYourSupportEnabled.mockResolvedValue(true);
    const { req } = buildReq('questions', '123', undefined, {
      session: { yourSupportReturnTo: { '123': 'dashboard' } },
    });

    await expect(extendGetContent(req)).resolves.toEqual({
      cuiYourSupportEnabled: true,
      backUrl: '/case/123/dashboard',
    });
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

  it('is truthy once the defendant has said no support is needed (YOUR_SUPPORT in completedSections)', () => {
    const req = reqWith({ defendantResponses: { completedSections: ['YOUR_SUPPORT'] } });

    expect(Boolean(isAnswered(req))).toBe(true);
  });

  it('is falsy when other sections are complete but Your Support is not', () => {
    const req = reqWith({ defendantResponses: { completedSections: ['PERSONAL_DETAILS'] } });

    expect(Boolean(isAnswered(req))).toBe(false);
  });
});

describe('reasonable-adjustments-triage resolveRedirectAfterPost (skip returns to where Your Support was launched from)', () => {
  it('returns the task-list url when Your Support was launched from the task list', async () => {
    const { req } = buildReq('skip', '123', undefined, { session: { yourSupportReturnTo: { '123': 'task-list' } } });

    await expect(resolveRedirectAfterPost(req)).resolves.toBe('/case/123/respond-to-claim/task-list');
  });

  it('returns the dashboard url when Your Support was launched from the dashboard', async () => {
    const { req } = buildReq('skip', '123', undefined, { session: { yourSupportReturnTo: { '123': 'dashboard' } } });

    await expect(resolveRedirectAfterPost(req)).resolves.toBe('/case/123/dashboard');
  });

  it('falls back to the task-list url when no origin was recorded before submission', async () => {
    const req = { res: { locals: { validatedCase: { id: '123' } } } } as unknown as Request;

    await expect(resolveRedirectAfterPost(req)).resolves.toBe('/case/123/respond-to-claim/task-list');
  });

  it('returns undefined when there is no case reference (postHandler then falls back to flow nav)', async () => {
    const req = { res: { locals: { validatedCase: undefined } } } as unknown as Request;

    await expect(resolveRedirectAfterPost(req)).resolves.toBeUndefined();
  });
});
