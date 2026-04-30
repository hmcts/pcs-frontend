import type { Request, Response } from 'express';

const mockGetNextStepUrl = jest.fn(async () => '/case/1234567890123456/respond-to-claim/language-used');
const mockSafeRedirect303 = jest.fn();
const mockGetDashboardUrl = jest.fn((caseId?: string) => (caseId ? `/dashboard/${caseId}` : null));
const mockBuildCcdCaseForPossessionClaimResponse = jest.fn();

jest.mock('../../../../main/modules/steps', () => ({
  createGetController: jest.fn(() => ({ get: jest.fn() })),
  createStepNavigation: jest.fn(() => ({
    getBackUrl: jest.fn(async () => '/previous-step'),
    getNextStepUrl: mockGetNextStepUrl,
  })),
  getTranslationFunction: jest.fn(() => jest.fn((key: string, fallback?: string) => fallback || key)),
  loadStepNamespace: jest.fn(),
}));

jest.mock('../../../../main/routes/dashboard', () => ({
  getDashboardUrl: mockGetDashboardUrl,
}));

jest.mock('../../../../main/utils/safeRedirect', () => ({
  safeRedirect303: (...args: unknown[]) => mockSafeRedirect303(...args),
}));

jest.mock('../../../../main/steps/respond-to-claim/stepRegistry', () => ({
  stepRegistry: {},
}));

jest.mock('../../../../main/steps/utils/populateResponseToClaimPayloadmap', () => ({
  buildCcdCaseForPossessionClaimResponse: (...args: Parameters<typeof mockBuildCcdCaseForPossessionClaimResponse>) =>
    mockBuildCcdCaseForPossessionClaimResponse(...args),
}));

describe('respond-to-claim section check-your-answers POST', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to dashboard for save for later action', async () => {
    const { step } = await import('../../../../main/steps/respond-to-claim/check-your-answers');
    if (!step.postController) {
      throw new Error('expected postController');
    }

    const req = {
      body: { action: 'saveForLater' },
      query: { section: 'payments' },
      res: { locals: { validatedCase: { id: '1234567890123456' } } },
    } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as Response;

    await step.postController.post(req, res, jest.fn());

    expect(mockBuildCcdCaseForPossessionClaimResponse).toHaveBeenCalledWith(req, {
      defendantResponses: {
        sectionStatuses: [{ value: { sectionId: 'payments', status: 'IN_PROGRESS' } }],
      },
    });
    expect(mockSafeRedirect303).toHaveBeenCalledWith(res, '/dashboard/1234567890123456', '/', ['/dashboard']);
  });

  it('redirects to dashboard for save and continue action', async () => {
    const { step } = await import('../../../../main/steps/respond-to-claim/check-your-answers');
    if (!step.postController) {
      throw new Error('expected postController');
    }

    const req = {
      body: { action: 'saveAndContinue' },
      query: { section: 'payments' },
      res: { locals: { validatedCase: { id: '1234567890123456' } } },
    } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as Response;

    await step.postController.post(req, res, jest.fn());

    expect(mockBuildCcdCaseForPossessionClaimResponse).toHaveBeenCalledWith(req, {
      defendantResponses: {
        sectionStatuses: [{ value: { sectionId: 'payments', status: 'COMPLETED' } }],
      },
    });
    expect(mockSafeRedirect303).toHaveBeenCalledWith(res, '/dashboard/1234567890123456', '/', ['/dashboard']);
  });

  it('returns 400 when section CYA action is unsupported', async () => {
    const { step } = await import('../../../../main/steps/respond-to-claim/check-your-answers');
    if (!step.postController) {
      throw new Error('expected postController');
    }

    const req = {
      body: { action: 'unsupportedAction' },
      query: { section: 'payments' },
      res: { locals: { validatedCase: { id: '1234567890123456' } } },
    } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as Response;

    await step.postController.post(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Invalid action for section check your answers');
    expect(mockBuildCcdCaseForPossessionClaimResponse).not.toHaveBeenCalled();
    expect(mockSafeRedirect303).not.toHaveBeenCalled();
  });
});
