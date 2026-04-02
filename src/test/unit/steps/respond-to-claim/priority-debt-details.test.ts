import type { Environment } from 'nunjucks';

jest.mock('../../../../main/modules/steps/i18n', () => ({
  loadStepNamespace: jest.fn(),
  getStepTranslations: jest.fn(() => ({})),
  getTranslationFunction: jest.fn(() => (key: string) => key),
}));

jest.mock('../../../../main/modules/i18n', () => ({
  getRequestLanguage: jest.fn(() => 'en'),
  getCommonTranslations: jest.fn(() => ({})),
}));

jest.mock('../../../../main/modules/steps/flow', () => ({
  stepNavigation: {
    getBackUrl: jest.fn(async () => null),
    getNextStepUrl: jest.fn(async () => '/next-step'),
  },
  createStepNavigation: jest.fn(() => ({
    getBackUrl: jest.fn(async () => '/previous-step'),
    getNextStepUrl: jest.fn(async () => '/next-step'),
  })),
}));

jest.mock('../../../../main/modules/steps/formBuilder/helpers', () => {
  const actual = jest.requireActual('../../../../main/modules/steps/formBuilder/helpers');
  return {
    ...actual,
    validateForm: jest.fn(),
  };
});

const mockBuildCcdCaseForPossessionClaimResponse = jest.fn();
jest.mock('../../../../main/steps/utils/populateResponseToClaimPayloadmap', () => ({
  buildCcdCaseForPossessionClaimResponse: mockBuildCcdCaseForPossessionClaimResponse,
}));

import { validateForm } from '../../../../main/modules/steps/formBuilder/helpers';
import { step } from '../../../../main/steps/respond-to-claim/priority-debt-details';

describe('respond-to-claim priority-debt-details step', () => {
  const nunjucksEnv = { render: jest.fn() } as unknown as Environment;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createReq = (overrides: Record<string, unknown> = {}): any => ({
    body: {},
    originalUrl: '/case/1234567890123456/respond-to-claim/priority-debt-details',
    query: { lang: 'en' },
    params: { caseReference: '1234567890123456' },
    session: {
      formData: {},
      ccdCase: { id: '1234567890123456' },
    },
    app: { locals: { nunjucksEnv } },
    i18n: { getResourceBundle: jest.fn(() => ({})) },
    res: { locals: { validatedCase: { id: '1234567890123456', data: {} } } },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildCcdCaseForPossessionClaimResponse.mockResolvedValue({ id: '1234567890123456', data: {} });
  });

  it('maps amounts to pence and normalizes frequency', async () => {
    (validateForm as jest.Mock).mockReturnValue({});
    const req = createReq({
      body: {
        action: 'continue',
        priorityDebtTotal: '148.50',
        priorityDebtContribution: '20.00',
        priorityDebtContributionFrequency: 'week',
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;
    const next = jest.fn();

    if (!step.postController) {
      throw new Error('expected postController');
    }

    await step.postController.post(req, res, next);

    expect(mockBuildCcdCaseForPossessionClaimResponse).toHaveBeenCalledWith(expect.anything(), {
      defendantResponses: {
        householdCircumstances: {
          debtTotal: '14850',
          debtContribution: '2000',
          debtContributionFrequency: 'WEEK',
        },
      },
    });
  });
});
