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

const t = ((key: string) => {
  const translations: Record<string, string> = {
    pageTitle: 'Have you come to any agreement to repay the arrears?',
    caption: 'Respond to a property possession claim',
    question: 'Have you come to any agreement with Treetops Housing to repay the arrears since 20th May 2025?',
    'options.yes': 'Yes',
    'options.no': 'No',
    'options.or': 'or',
    'options.imNotSure': "I'm not sure",
    textAreaLabel:
      'Give details about how much you’ve agreed to pay, how often you’ll pay and when the agreement was made',
    textAreaHint: 'You can enter up to 500 characters',
    'errors.confirmRepaymentsAgreed':
      'Select whether you have come to any agreement with Treetops Housing to repay the arrears since 20th May 2025',
    'errors.repaymentsAgreementInfo':
      'Give details about how much you’ve agreed to pay, how often you’ll pay and when the agreement was made',
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
import { step } from '../../../../main/steps/respond-to-claim/repayments-agreed';

describe('respond-to-claim repayments-agreed step', () => {
  const nunjucksEnv = { render: jest.fn() } as unknown as Environment;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createReq = (overrides: Record<string, unknown> = {}): any =>
    ({
      body: {},
      originalUrl: '/case/1234567890123456/respond-to-claim/repayments-agreed',
      query: { lang: 'en' },
      params: { caseReference: '1234567890123456' },
      session: {
        formData: {},
        ccdCase: {
          id: '1234567890123456',
          data: { claimantName: 'Treetops Housing', claimIssueDate: '20th May 2025' },
        },
      },
      app: { locals: { nunjucksEnv } },
      i18n: { getResourceBundle: jest.fn(() => ({})) },
      res: { locals: { validatedCase: { id: '1234567890123456' } } },
      ...overrides,
    }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes correct step url and view', () => {
    expect(step.name).toBe('repayments-agreed');
    expect(step.url).toBe('/case/:caseReference/respond-to-claim/repayments-agreed');
    expect(step.view).toContain('formBuilder.njk');
  });

  it('GET renders repayments-agreed content', async () => {
    const controller = typeof step.getController === 'function' ? step.getController() : step.getController;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { render: jest.fn() } as any;

    await controller.get(createReq(), res);

    expect(res.render).toHaveBeenCalledWith(
      step.view,
      expect.objectContaining({
        pageTitle: 'Have you come to any agreement to repay the arrears?',
        caption: 'Respond to a property possession claim',
        heading: 'Have you come to any agreement with Treetops Housing to repay the arrears since 20th May 2025?',
      })
    );
  });

  it('POST shows error when no option selected', async () => {
    (validateForm as jest.Mock).mockReturnValue({
      confirmRepaymentsAgreed:
        'Select whether you have come to any agreement with Treetops Housing to repay the arrears since 20th May 2025',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { status: jest.fn().mockReturnThis(), render: jest.fn() } as any;
    const next = jest.fn();

    await step.postController!.post(
      createReq({ body: { action: 'continue', confirmRepaymentsAgreed: '' } }),
      res,
      next
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith(step.view, expect.objectContaining({ errorSummary: expect.anything() }));
  });

  it('POST requires details when Yes is selected', async () => {
    (validateForm as jest.Mock).mockReturnValue({
      repaymentsAgreementInfo:
        'Give details about how much you’ve agreed to pay, how often you’ll pay and when the agreement was made',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { status: jest.fn().mockReturnThis(), render: jest.fn() } as any;
    const next = jest.fn();

    await step.postController!.post(
      createReq({
        body: {
          action: 'continue',
          confirmRepaymentsAgreed: 'yes',
          repaymentsAgreementInfo: '',
        },
      }),
      res,
      next
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith(step.view, expect.objectContaining({ errorSummary: expect.anything() }));
  });
});
