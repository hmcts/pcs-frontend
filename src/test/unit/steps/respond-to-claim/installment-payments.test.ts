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
jest.mock('../../../../main/steps/utils/buildDraftDefendantResponse', () => ({
  saveDraftDefendantResponse: mockBuildCcdCaseForPossessionClaimResponse,
}));

const t = ((key: string) => {
  const translations: Record<string, string> = {
    pageTitle: 'Instalment payments',
    caption: 'Respond to a property possession claim',
    heading: 'Instalment offer',
    paragraph1: 'Paragraph one',
    paragraph2: 'Paragraph two',
    paragraph3: 'Paragraph three',
    paragraph4: 'Paragraph four',
    question: 'Do you want to pay in instalments?',
    'options.yes': 'Yes',
    'options.no': 'No',
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
import { step } from '../../../../main/steps/respond-to-claim/installment-payments';

describe('respond-to-claim installment-payments step', () => {
  const nunjucksEnv = { render: jest.fn() } as unknown as Environment;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createReq = (overrides: Record<string, unknown> = {}): any => ({
    body: {},
    originalUrl: '/case/1234567890123456/respond-to-claim/installment-payments',
    query: { lang: 'en' },
    params: { caseReference: '1234567890123456' },
    session: {
      formData: {},
      ccdCase: { id: '1234567890123456' },
    },
    app: { locals: { nunjucksEnv } },
    i18n: { getResourceBundle: jest.fn(() => ({})) },
    res: { locals: { validatedCase: { id: '1234567890123456' } } },

    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildCcdCaseForPossessionClaimResponse.mockResolvedValue({ id: '1234567890123456', data: {} });
  });

  it('exposes correct step url and view', () => {
    expect(step.name).toBe('installment-payments');
    expect(step.url).toBe('/case/:caseReference/respond-to-claim/installment-payments');
    expect(step.view).toContain('instalmentOffer.njk');
  });

  it('POST saves Yes to defendantResponses.paymentAgreement', async () => {
    (validateForm as jest.Mock).mockReturnValue({});

    const req = createReq({
      body: {
        action: 'continue',
        confirmInstallmentOffer: 'yes',
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
        paymentAgreement: { repayArrearsInstalments: 'YES' },
      },
    });
    expect(res.redirect).toHaveBeenCalledWith(303, '/next-step');
  });
});
