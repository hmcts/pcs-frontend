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
    pageTitle: 'Instalments',
    heading: 'Instalments',
    paragraph1:
      'A decision about the instalments you can afford to pay will be made at the hearing. You’ll be able to tell the judge if your circumstances have changed between now and the hearing.',
    amountQuestion: 'How much could you afford to pay in addition to the current rent?',
    frequencyQuestion: 'How frequently could you afford to pay this amount?',
    frequencyHint: 'Paid every:',
    'frequencyOptions.weekly': 'Weekly',
    'frequencyOptions.every2Weeks': 'Every 2 weeks',
    'frequencyOptions.every4Weeks': 'Every 4 weeks',
    'frequencyOptions.monthly': 'Monthly',
    'errors.installmentAmount': 'Enter how much you could afford to pay in addition to the current rent',
    'errors.installmentAmountFormat': 'Enter an amount in the correct format, for example 148.00 or 148.50',
    'errors.installmentAmountMax':
      'The amount you could afford to pay in addition to the current rent must be less than £1 billion',
    'errors.installmentAmountMin':
      'The amount you could afford to pay in addition to the current rent must be £0.00 or above',
    'errors.installmentFrequency': 'Select how frequently you could afford to pay this amount',
    // Common keys
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
import { step } from '../../../../main/steps/respond-to-claim/how-much-afford-to-pay';

describe('respond-to-claim installments step', () => {
  const nunjucksEnv = { render: jest.fn() } as unknown as Environment;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createReq = (overrides: Record<string, unknown> = {}): any => ({
    body: {},
    originalUrl: '/case/1234567890123456/respond-to-claim/how-much-afford-to-pay',
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
    expect(step.name).toBe('how-much-afford-to-pay');
    expect(step.url).toBe('/case/:caseReference/respond-to-claim/how-much-afford-to-pay');
    expect(step.view).toContain('formBuilder.njk');
  });

  it('GET renders installments content and adds currency prefix', async () => {
    const controller = typeof step.getController === 'function' ? step.getController() : step.getController;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { render: jest.fn() } as any;

    await controller.get(createReq(), res);

    expect(res.render).toHaveBeenCalledWith(
      step.view,
      expect.objectContaining({
        pageTitle: 'Instalments',
        heading: 'Instalments',
      })
    );

    const viewModel = res.render.mock.calls[0][1] as { fields: Record<string, unknown>[] };
    const amountField = viewModel.fields.find(f => f.name === 'installmentAmount') as
      | { component?: { prefix?: { text?: string } } }
      | undefined;
    expect(amountField?.component?.prefix?.text).toBe('£');
  });

  it('POST returns validation errors for invalid amount and missing frequency', async () => {
    (validateForm as jest.Mock).mockReturnValue({
      installmentAmount: 'Enter an amount in the correct format, for example 148.00 or 148.50',
      installmentFrequency: 'Select how frequently you could afford to pay this amount',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { status: jest.fn().mockReturnThis(), render: jest.fn() } as any;
    const next = jest.fn();

    if (!step.postController) {
      throw new Error('expected postController');
    }
    await step.postController.post(
      createReq({
        body: {
          action: 'continue',
          installmentAmount: 'ten',
          installmentFrequency: '',
        },
      }),
      res,
      next
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith(step.view, expect.objectContaining({ errorSummary: expect.anything() }));
  });

  it('POST accepts valid amount and frequency', async () => {
    (validateForm as jest.Mock).mockReturnValue({});

    const req = createReq({
      body: {
        action: 'continue',
        installmentAmount: '123.45',
        installmentFrequency: 'monthly',
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;
    const next = jest.fn();

    if (!step.postController) {
      throw new Error('expected postController');
    }
    await step.postController.post(req, res, next);

    expect(mockBuildCcdCaseForPossessionClaimResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          installmentAmount: '123.45',
          installmentFrequency: 'monthly',
        }),
      }),
      {
        defendantResponses: {
          paymentAgreement: {
            additionalRentContribution: '12345',
            additionalContributionFrequency: 'monthly',
          },
        },
      }
    );
    expect(res.redirect).toHaveBeenCalledWith(303, '/next-step');
  });
});
