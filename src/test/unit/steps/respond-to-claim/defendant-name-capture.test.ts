import type { Environment } from 'nunjucks';

const t = ((key: string) => {
  const translations: Record<string, string> = {
    // Step translations
    pageTitle: 'Your name',
    heading: 'Whats your name?',
    caption: 'Respond to a property possession claim',
    contactUs: 'Contact us for help',
    firstNameLabel: 'First name',
    lastNameLabel: 'Last name',
    'errors.firstName.required': 'Enter your first name',
    'errors.lastName.required': 'Enter your last name',

    // Common translations used by buildFormContent
    'buttons.continue': 'Continue',
    'buttons.saveForLater': 'Save for later',
    'buttons.cancel': 'Cancel',
    'errors.title': 'There is a problem',
    serviceName: 'Test service',
    phase: 'ALPHA',
    feedback: 'Feedback',
    back: 'Back',
    languageToggle: 'Language toggle',
  };
  return translations[key] || key;
}) as unknown as (key: string, options?: unknown) => string;

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

import { validateForm } from '../../../../main/modules/steps/formBuilder/helpers';
import { step } from '../../../../main/steps/respond-to-claim/defendant-name-capture';

describe('respond-to-claim defendant-name-capture step', () => {
  const nunjucksEnv = { render: jest.fn() } as unknown as Environment;

  // Keep req/res loosely typed to avoid Express/i18n type augmentation conflicts in tests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createReq = (overrides: Record<string, unknown> = {}): any =>
    ({
      body: {},
      originalUrl: '/respond-to-claim/defendant-name-capture',
      query: { lang: 'en' },
      params: {},
      session: { formData: {}, ccdCase: { id: '123' } },
      app: { locals: { nunjucksEnv } },
      i18n: { getResourceBundle: jest.fn(() => ({})) },
      ...overrides,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes correct step url and view', () => {
    expect(step.name).toBe('defendant-name-capture');
    expect(step.url).toBe('/case/:caseReference/respond-to-claim/defendant-name-capture');
    expect(step.view).toContain('formBuilder.njk');
  });

  it('GET renders translated content and input attributes', async () => {
    const controller = typeof step.getController === 'function' ? step.getController() : step.getController;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { render: jest.fn() } as any;

    await controller.get(createReq(), res);

    expect(res.render).toHaveBeenCalledWith(
      step.view,
      expect.objectContaining({
        pageTitle: 'Your name',
        heading: 'Whats your name?',
        caption: 'Respond to a property possession claim',
        dashboardUrl: null,
        cancel: 'Cancel',
        backUrl: '/previous-step',
        fields: expect.any(Array),
      })
    );

    const viewModel = res.render.mock.calls[0][1] as { fields: Record<string, unknown>[] };
    const firstNameField = viewModel.fields.find(f => f.name === 'firstName') as
      | { component?: { label?: { classes?: string }; attributes?: Record<string, unknown> } }
      | undefined;
    const lastNameField = viewModel.fields.find(f => f.name === 'lastName') as
      | { component?: { label?: { classes?: string }; attributes?: Record<string, unknown> } }
      | undefined;

    expect(firstNameField?.component?.label?.classes).toBe('govuk-label--s');
    expect(firstNameField?.component?.attributes).toEqual(
      expect.objectContaining({
        autocomplete: 'given-name',
        spellcheck: false,
      })
    );

    expect(lastNameField?.component?.attributes).toEqual(
      expect.objectContaining({
        autocomplete: 'family-name',
        spellcheck: false,
      })
    );
  });

  it('POST renders errors when validation fails', async () => {
    (validateForm as jest.Mock).mockReturnValue({ firstName: 'Enter your first name' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { status: jest.fn().mockReturnThis(), render: jest.fn() } as any;
    const next = jest.fn();

    await step.postController!.post(
      createReq({ body: { action: 'continue', firstName: '', lastName: '' } }),
      res,
      next
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith(step.view, expect.objectContaining({ errorSummary: expect.anything() }));
  });

  it('POST saves data and redirects when validation passes', async () => {
    (validateForm as jest.Mock).mockReturnValue({});

    const req = createReq({ body: { action: 'continue', firstName: 'Jane', lastName: 'Doe' } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;
    const next = jest.fn();

    await step.postController!.post(req, res, next);

    expect(req.session.formData?.['defendant-name-capture']).toEqual({ firstName: 'Jane', lastName: 'Doe' });
    expect(res.redirect).toHaveBeenCalledWith(303, '/next-step');
  });
});
