jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

const mockStartPcq = jest.fn();
jest.mock('@services/pcq/startPcq', () => ({
  startPcq: mockStartPcq,
}));

import type { Request } from 'express';

import { step } from '../../../../main/steps/respond-to-claim/reasonable-adjustments-triage';

const beforeRedirect = (step as unknown as { beforeRedirect: (req: Request) => Promise<void> }).beforeRedirect;

const buildReq = (choice: string): { req: Request; redirect: jest.Mock } => {
  const redirect = jest.fn();
  const req = {
    body: { reasonableAdjustmentsChoice: choice },
    res: {
      locals: { validatedCase: { id: '123456789' } },
      redirect,
    },
  } as unknown as Request;
  return { req, redirect };
};

describe('reasonable-adjustments-triage beforeRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStartPcq.mockResolvedValue('https://pcq.test/service-endpoint?token=abc');
  });

  it('redirects to PCQ when the citizen declines support', async () => {
    const { req, redirect } = buildReq('skip');

    await beforeRedirect(req);

    expect(mockStartPcq).toHaveBeenCalledWith(req);
    expect(redirect).toHaveBeenCalledWith(303, 'https://pcq.test/service-endpoint?token=abc');
  });

  it('does not invoke PCQ when the citizen continues to the Your Support questions', async () => {
    const { req, redirect } = buildReq('questions');

    await beforeRedirect(req);

    expect(mockStartPcq).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('falls through to the normal next step when PCQ is unavailable', async () => {
    mockStartPcq.mockResolvedValue(null);
    const { req, redirect } = buildReq('skip');

    await beforeRedirect(req);

    // No redirect issued, so the step controller carries on to language-used — an optional
    // questionnaire must never block the citizen's response.
    expect(redirect).not.toHaveBeenCalled();
  });
});
