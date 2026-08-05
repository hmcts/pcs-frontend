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
  });

  it('does nothing (skips) when the choice is not "questions"', async () => {
    const { req, redirect } = buildReq('skip', '123');

    await beforeRedirect(req);

    expect(mockStartYourSupport).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('does not launch Your Support when the feature flag is off (falls through like skip)', async () => {
    mockIsCuiYourSupportEnabled.mockResolvedValue(false);
    const { req, redirect } = buildReq('questions', '123');

    await beforeRedirect(req);

    expect(mockStartYourSupport).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('launches Your Support and 303-redirects to the microsite url on "questions"', async () => {
    mockStartYourSupport.mockResolvedValue('https://cui-ra/microsite/xyz');
    const { req, redirect } = buildReq('questions', '123');

    await beforeRedirect(req);

    expect(mockStartYourSupport).toHaveBeenCalledWith(req);
    expect(redirect).toHaveBeenCalledWith(303, 'https://cui-ra/microsite/xyz');
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
