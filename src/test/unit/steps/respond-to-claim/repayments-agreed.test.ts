import type { Environment } from 'nunjucks';

jest.mock('../../../../main/modules/steps/i18n', () => ({
  loadStepNamespace: jest.fn(),
  getStepTranslations: jest.fn(() => ({})),
  getTranslationFunction: jest.fn(() => t),
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

const t = ((key: string) => {
  const translations: Record<string, string> = {
    pageTitle: 'Repayments agreed',
    question: 'Have you come to any agreement with {{claimantName}} to repay the arrears since {{claimIssueDate}}?',
    'options.yes': 'Yes',
    'options.no': 'No',
    'options.or': 'or',
    'options.imNotSure': "I'm not sure",
    textAreaLabel:
      'Give details about how much you’ve agreed to pay, how often you’ll pay and when the agreement was made',
    textAreaHint: 'You can enter up to 500 characters',
    'errors.repaymentsAgreed':
      "Select if you've come to any agreement with Treetops Housing to repay the arrears since 20th May 2025",
    'errors.repaymentsAgreed.repaymentsAgreedDetails':
      'Give details about how much you’ve agreed to pay, how often you’ll pay and when the agreement was made',
    'buttons.saveAndContinue': 'Save and continue',
    'buttons.continue': 'Continue',
    'buttons.saveForLater': 'Save for later',
    'buttons.cancel': 'Cancel',
    'errors.title': 'There is a problem',
    serviceName: 'Test service',
    phase: 'ALPHA',
    feedback: 'Feedback',
    back: 'Back',
    languageToggle: 'Language toggle',
    contactUsForHelp: 'Contact us for help',
    contactUsForHelpText: 'You can contact us for help.',
  };
  return translations[key] || key;
}) as unknown as (key: string, options?: unknown) => string;

import { validateForm } from '../../../../main/modules/steps/formBuilder/helpers';
import { step } from '../../../../main/steps/respond-to-claim/repayments-agreed';

describe('respond-to-claim repayments-agreed step', () => {
  const nunjucksEnv = { render: jest.fn() } as unknown as Environment;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createReq = (overrides: Record<string, unknown> = {}): any => ({
    body: {},
    originalUrl: '/case/1234567890123456/respond-to-claim/repayments-agreed',
    query: { lang: 'en' },
    params: { caseReference: '1234567890123456' },
    session: {
      formData: {},
      user: { accessToken: 'token' },
    },
    app: { locals: { nunjucksEnv } },
    i18n: { getResourceBundle: jest.fn(() => ({})) },
    res: {
      locals: {
        validatedCase: {
          id: '1234567890123456',
          data: {
            possessionClaimResponse: {
              claimantOrganisations: [{ value: 'Treetops Housing' }],
            },
          },
        },
      },
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildCcdCaseForPossessionClaimResponse.mockResolvedValue({ id: '1234567890123456', data: {} });
  });

  it('exposes correct step url and default form view', () => {
    expect(step.name).toBe('repayments-agreed');
    expect(step.url).toBe('/case/:caseReference/respond-to-claim/repayments-agreed');
    expect(step.view).toContain('formBuilder.njk');
  });

  it('POST saves NO with defendantResponses.paymentAgreement', async () => {
    (validateForm as jest.Mock).mockReturnValue({});

    const req = createReq({
      body: {
        action: 'continue',
        repaymentsAgreed: 'no',
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
        paymentAgreement: {
          repaymentPlanAgreed: 'NO',
          repaymentAgreedDetails: undefined,
        },
      },
    });
  });

  it('POST saves YES with details', async () => {
    (validateForm as jest.Mock).mockReturnValue({});

    const req = createReq({
      body: {
        action: 'continue',
        repaymentsAgreed: 'yes',
        'repaymentsAgreed.repaymentsAgreedDetails': 'Paid £50 weekly',
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
        paymentAgreement: {
          repaymentPlanAgreed: 'YES',
          repaymentAgreedDetails: 'Paid £50 weekly',
        },
      },
    });
  });
});
