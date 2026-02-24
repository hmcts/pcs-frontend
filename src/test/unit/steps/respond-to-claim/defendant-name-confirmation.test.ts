import type { Environment } from 'nunjucks';

const t = ((key: string) => {
  const translations: Record<string, string> = {
    // Step translations
    pageTitle: 'Your name',
    caption: 'Respond to a property possession claim',
    contactUs: 'Contact us for help',
    nameConfirmationLabel: 'Is your name {{defendantName}}?',
    yesOption: 'Yes',
    noOption: 'No',
    firstNameLabel: 'First name',
    lastNameLabel: 'Last name',
    'errors.nameConfirmation.required': 'You must say if your name is {{defendantName}}',
    'errors.firstName.required': 'Enter your first name',
    'errors.lastName.required': 'Enter your last name',
    'errors.firstName.maxLength': 'First name must be 60 characters or less',
    'errors.lastName.maxLength': 'Last name must be 60 characters or less',

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
import { step } from '../../../../main/steps/respond-to-claim/defendant-name-confirmation';

describe('respond-to-claim defendant-name-confirmation step', () => {
  const nunjucksEnv = { render: jest.fn() } as unknown as Environment;

  // Keep req/res loosely typed to avoid Express/i18n type augmentation conflicts in tests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createReq = (overrides: Record<string, unknown> = {}): any =>
    ({
      body: {},
      originalUrl: '/respond-to-claim/defendant-name-confirmation',
      query: { lang: 'en' },
      params: {},
      session: { formData: {}, ccdCase: { id: '123' } },
      app: { locals: { nunjucksEnv } },
      i18n: { getResourceBundle: jest.fn(() => ({})) },
      res: {
        locals: {
          validatedCase: {
            data: {
              possessionClaimResponse: {
                defendantContactDetails: {
                  party: {
                    firstName: 'John',
                    lastName: 'Smith',
                  },
                },
              },
            },
          },
        },
      },
      ...overrides,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes correct step url and view', () => {
    expect(step.name).toBe('defendant-name-confirmation');
    expect(step.url).toBe('/case/:caseReference/respond-to-claim/defendant-name-confirmation');
    expect(step.view).toContain('defendantNameConfirmation.njk');
  });

  it('GET renders with defendant name from CCD', async () => {
    const controller = typeof step.getController === 'function' ? step.getController() : step.getController;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { render: jest.fn() } as any;

    await controller.get(createReq(), res);

    expect(res.render).toHaveBeenCalledWith(
      step.view,
      expect.objectContaining({
        defendantName: 'John Smith',
      })
    );
  });

  it('POST saves nameConfirmation=yes and redirects when validation passes', async () => {
    (validateForm as jest.Mock).mockReturnValue({});

    const req = createReq({ body: { action: 'continue', nameConfirmation: 'yes' } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;
    const next = jest.fn();

    await step.postController!.post(req, res, next);

    expect(req.session.formData?.['defendant-name-confirmation']).toEqual({ nameConfirmation: 'yes' });
    expect(res.redirect).toHaveBeenCalledWith(303, '/next-step');
  });

  it('POST saves corrected name when nameConfirmation=no', async () => {
    (validateForm as jest.Mock).mockReturnValue({});

    const req = createReq({
      body: { action: 'continue', nameConfirmation: 'no', firstName: 'Jane', lastName: 'Doe' },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;
    const next = jest.fn();

    await step.postController!.post(req, res, next);

    expect(req.session.formData?.['defendant-name-confirmation']).toEqual({
      nameConfirmation: 'no',
      firstName: 'Jane',
      lastName: 'Doe',
    });
    expect(res.redirect).toHaveBeenCalledWith(303, '/next-step');
  });

  it('POST renders error when firstName exceeds 60 characters and nameConfirmation=no', async () => {
    const longFirstName = 'A'.repeat(61);
    (validateForm as jest.Mock).mockReturnValue({ firstName: 'First name must be 60 characters or less' });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { status: jest.fn().mockReturnThis(), render: jest.fn() } as any;
    const next = jest.fn();

    await step.postController!.post(
      createReq({ body: { action: 'continue', nameConfirmation: 'no', firstName: longFirstName, lastName: 'Doe' } }),
      res,
      next
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith(step.view, expect.objectContaining({ errorSummary: expect.anything() }));
  });

  it('POST renders error when lastName exceeds 60 characters and nameConfirmation=no', async () => {
    const longLastName = 'B'.repeat(61);
    (validateForm as jest.Mock).mockReturnValue({ lastName: 'Last name must be 60 characters or less' });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { status: jest.fn().mockReturnThis(), render: jest.fn() } as any;
    const next = jest.fn();

    await step.postController!.post(
      createReq({ body: { action: 'continue', nameConfirmation: 'no', firstName: 'Jane', lastName: longLastName } }),
      res,
      next
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith(step.view, expect.objectContaining({ errorSummary: expect.anything() }));
  });
});
