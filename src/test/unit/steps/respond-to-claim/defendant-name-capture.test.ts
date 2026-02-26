import type { NextFunction } from 'express';
import type { Environment } from 'nunjucks';

const mockTranslations: Record<string, string> = {
  pageTitle: 'Your name',
  heading: 'Whats your name?',
  caption: 'Respond to a property possession claim',
  firstNameLabel: 'First name',
  lastNameLabel: 'Last name',
  'errors.firstName.required': 'Enter your first name',
  'errors.lastName.required': 'Enter your last name',
  'errors.firstName.maxLength': 'First name must be 60 characters or less',
  'errors.lastName.maxLength': 'Last name must be 60 characters or less',
  'buttons.continue': 'Continue',
  'buttons.cancel': 'Cancel',
  'errors.title': 'There is a problem',
};

const t = ((key: string) => mockTranslations[key] || key) as unknown as (key: string, options?: unknown) => string;

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

jest.mock('../../../../main/modules/steps/formBuilder/helpers', () => ({
  ...jest.requireActual('../../../../main/modules/steps/formBuilder/helpers'),
  validateForm: jest.fn(),
}));

import { validateForm } from '../../../../main/modules/steps/formBuilder/helpers';
import { step } from '../../../../main/steps/respond-to-claim/defendant-name-capture';

describe('defendant-name-capture', () => {
  const nunjucksEnv = { render: jest.fn() } as unknown as Environment;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockReq = (overrides = {}): any => ({
    body: {},
    originalUrl: '/respond-to-claim/defendant-name-capture',
    query: { lang: 'en' },
    params: {},
    session: { formData: {}, ccdCase: { id: '123' } },
    app: { locals: { nunjucksEnv } },
    i18n: { getResourceBundle: jest.fn(() => ({})) },
    ...overrides,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockRes = (): any => ({
    render: jest.fn(),
    redirect: jest.fn(),
    status: jest.fn().mockReturnThis(),
  });

  const mockNext = (): NextFunction => jest.fn();

  beforeEach(() => jest.clearAllMocks());

  describe('configuration', () => {
    it('has correct name, url and view', () => {
      expect(step.name).toBe('defendant-name-capture');
      expect(step.url).toBe('/case/:caseReference/respond-to-claim/defendant-name-capture');
      expect(step.view).toContain('formBuilder.njk');
    });
  });

  describe('GET', () => {
    it('renders form with correct content and field attributes', async () => {
      const controller = typeof step.getController === 'function' ? step.getController() : step.getController;
      const res = mockRes();

      await controller.get(mockReq(), res);

      expect(res.render).toHaveBeenCalledWith(
        step.view,
        expect.objectContaining({
          pageTitle: 'Your name',
          heading: 'Whats your name?',
          caption: 'Respond to a property possession claim',
          dashboardUrl: '/dashboard/1234567890123456',
          cancel: 'Cancel',
          backUrl: '/previous-step',
          fields: expect.any(Array),
        })
      );

      const viewModel = (res.render as jest.Mock).mock.calls[0][1];
      const firstNameField = viewModel.fields.find((f: { name: string }) => f.name === 'firstName');
      const lastNameField = viewModel.fields.find((f: { name: string }) => f.name === 'lastName');

      expect(firstNameField.component.label.classes).toBe('govuk-label--s');
      expect(firstNameField.component.attributes).toMatchObject({ autocomplete: 'given-name', spellcheck: false });
      expect(lastNameField.component.attributes).toMatchObject({ autocomplete: 'family-name', spellcheck: false });
    });
  });

  describe('POST', () => {
    it('renders error when validation fails', async () => {
      (validateForm as jest.Mock).mockReturnValue({ firstName: 'Enter your first name' });
      const res = mockRes();

      await step.postController!.post(
        mockReq({ body: { action: 'continue', firstName: '', lastName: '' } }),
        res,
        mockNext()
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith(step.view, expect.objectContaining({ errorSummary: expect.anything() }));
    });

    it('saves data and redirects when validation passes', async () => {
      (validateForm as jest.Mock).mockReturnValue({});
      const req = mockReq({ body: { action: 'continue', firstName: 'Jane', lastName: 'Doe' } });
      const res = mockRes();

      await step.postController!.post(req, res, mockNext());

      expect(req.session.formData['defendant-name-capture']).toEqual({ firstName: 'Jane', lastName: 'Doe' });
      expect(res.redirect).toHaveBeenCalledWith(303, '/next-step');
    });
  });
});
