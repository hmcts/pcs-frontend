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
import { step } from '../../../../main/steps/respond-to-claim/regular-income';

type SessionShape = {
  formData: Record<string, unknown>;
  ccdCase: { id: string };
};

describe('respond-to-claim regular-income step', () => {
  const caseReference = '1234567890123456';
  const nunjucksEnv = { render: jest.fn() } as unknown as Environment;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createReq = (overrides: Record<string, unknown> = {}): any => ({
    body: {},
    originalUrl: `/case/${caseReference}/respond-to-claim/what-regular-income-do-you-receive`,
    query: { lang: 'en' },
    params: { caseReference },
    session: {
      formData: {},
      ccdCase: { id: caseReference },
    } as SessionShape,
    app: { locals: { nunjucksEnv } },
    i18n: { getResourceBundle: jest.fn(() => ({})) },
    res: { locals: { validatedCase: { id: caseReference, data: {} } } },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildCcdCaseForPossessionClaimResponse.mockResolvedValue({ id: caseReference, data: {} });
  });

  const lastPayload = (): Record<string, unknown> => {
    const call = mockBuildCcdCaseForPossessionClaimResponse.mock.calls[0];
    return call[1] as Record<string, unknown>;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getHouseholdCircumstances = (): any =>
    (lastPayload().defendantResponses as Record<string, unknown>).householdCircumstances;

  it('POST writes UC=YES, amount and frequency when UC is ticked (implicit applied=YES)', async () => {
    (validateForm as jest.Mock).mockReturnValue({});
    const req = createReq({
      body: {
        action: 'continue',
        regularIncome: 'universalCredit',
        'regularIncome.universalCreditAmount': '200.00',
        'regularIncome.universalCreditFrequency': 'MONTHLY',
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;
    const next = jest.fn();

    if (!step.postController) {
      throw new Error('expected postController');
    }

    await step.postController.post(req, res, next);

    const hc = getHouseholdCircumstances();
    expect(hc.universalCredit).toBe('YES');
    expect(hc.universalCreditAmount).toBe('20000');
    expect(hc.universalCreditFrequency).toBe('MONTHLY');
    // Must NOT touch ucApplicationDate — that's owned by the applied-for-UC screen
    expect(hc).not.toHaveProperty('ucApplicationDate');
  });

  it('POST clears UC income fields when UC is unticked', async () => {
    (validateForm as jest.Mock).mockReturnValue({});
    const req = createReq({
      body: {
        action: 'continue',
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;
    const next = jest.fn();

    if (!step.postController) {
      throw new Error('expected postController');
    }

    await step.postController.post(req, res, next);

    const hc = getHouseholdCircumstances();
    expect(hc).not.toHaveProperty('universalCredit');
    expect(hc.universalCreditAmount).toBeNull();
    expect(hc.universalCreditFrequency).toBeNull();
  });
});
