jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

const mockStartPcq = jest.fn();
jest.mock('@services/pcq/startPcq', () => ({
  startPcq: mockStartPcq,
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
    mockStartPcq.mockResolvedValue('https://pcq.test/service-endpoint?token=abc');
    mockStartYourSupport.mockResolvedValue('https://cui-ra/microsite/xyz');
  });

  describe('declining support hands the citizen to PCQ', () => {
    it('redirects to PCQ', async () => {
      const { req, redirect } = buildReq('skip', '123');

      await beforeRedirect(req);

      expect(mockStartPcq).toHaveBeenCalledWith(req);
      expect(redirect).toHaveBeenCalledWith(303, 'https://pcq.test/service-endpoint?token=abc');
    });

    it('never launches Your Support, which the citizen has just declined', async () => {
      const { req, redirect } = buildReq('skip', '123');

      await beforeRedirect(req);

      // Regression guard: without an early return the PCQ branch falls through into the Your
      // Support launch, creating a cui-ra payload for a citizen who said no and firing a second
      // redirect on an already-sent response.
      expect(mockStartYourSupport).not.toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledTimes(1);
    });

    it('falls through to the normal next step when PCQ is unavailable', async () => {
      mockStartPcq.mockResolvedValue(null);
      const { req, redirect } = buildReq('skip', '123');

      await beforeRedirect(req);

      // No redirect issued, so the step controller carries on to language-used — an optional
      // questionnaire must never block the citizen's response.
      expect(redirect).not.toHaveBeenCalled();
      expect(mockStartYourSupport).not.toHaveBeenCalled();
    });
  });

  describe('continuing to the questions launches Your Support', () => {
    it('303-redirects to the microsite url and does not invoke PCQ', async () => {
      const { req, redirect } = buildReq('questions', '123');

      await beforeRedirect(req);

      expect(mockStartYourSupport).toHaveBeenCalledWith(req);
      expect(redirect).toHaveBeenCalledWith(303, 'https://cui-ra/microsite/xyz');
      expect(mockStartPcq).not.toHaveBeenCalled();
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
