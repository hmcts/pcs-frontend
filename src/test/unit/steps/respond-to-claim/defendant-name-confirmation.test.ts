import type { NextFunction } from 'express';
import type { Environment } from 'nunjucks';

const mockTranslations: Record<string, string> = {
  pageTitle: 'Your name',
  caption: 'Respond to a property possession claim',
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
import { step } from '../../../../main/steps/respond-to-claim/defendant-name-confirmation';

describe('defendant-name-confirmation', () => {
  const nunjucksEnv = { render: jest.fn() } as unknown as Environment;

  const mockCCDCase = (firstName = 'John', lastName = 'Smith') => ({
    data: {
      possessionClaimResponse: {
        defendantContactDetails: {
          party: { firstName, lastName },
        },
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockReq = (overrides = {}): any => ({
    body: {},
    originalUrl: '/respond-to-claim/defendant-name-confirmation',
    query: { lang: 'en' },
    params: {},
    session: { formData: {}, ccdCase: { id: '123' } },
    app: { locals: { nunjucksEnv } },
    i18n: { getResourceBundle: jest.fn(() => ({})) },
    res: { locals: { validatedCase: mockCCDCase() } },
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
      expect(step.name).toBe('defendant-name-confirmation');
      expect(step.url).toBe('/case/:caseReference/respond-to-claim/defendant-name-confirmation');
      expect(step.view).toContain('defendantNameConfirmation.njk');
    });
  });

  describe('GET', () => {
    it('renders with defendant name from CCD', async () => {
      const controller = typeof step.getController === 'function' ? step.getController() : step.getController;
      const res = mockRes();

      await controller.get(mockReq(), res);

      expect(res.render).toHaveBeenCalledWith(step.view, expect.objectContaining({ defendantName: 'John Smith' }));
    });

    it('renders with different defendant name', async () => {
      const controller = typeof step.getController === 'function' ? step.getController() : step.getController;
      const req = mockReq({ res: { locals: { validatedCase: mockCCDCase('Jane', 'Doe') } } });
      const res = mockRes();

      await controller.get(req, res);

      expect(res.render).toHaveBeenCalledWith(step.view, expect.objectContaining({ defendantName: 'Jane Doe' }));
    });
  });

  describe('POST', () => {
    it('saves nameConfirmation=yes and redirects', async () => {
      (validateForm as jest.Mock).mockReturnValue({});
      const req = mockReq({ body: { action: 'continue', nameConfirmation: 'yes' } });
      const res = mockRes();

      await step.postController!.post(req, res, mockNext());

      expect(req.session.formData['defendant-name-confirmation']).toEqual({ nameConfirmation: 'yes' });
      expect(res.redirect).toHaveBeenCalledWith(303, '/next-step');
    });

    it('saves corrected name when nameConfirmation=no', async () => {
      (validateForm as jest.Mock).mockReturnValue({});
      const req = mockReq({ body: { action: 'continue', nameConfirmation: 'no', firstName: 'Jane', lastName: 'Doe' } });
      const res = mockRes();

      await step.postController!.post(req, res, mockNext());

      expect(req.session.formData['defendant-name-confirmation']).toEqual({
        nameConfirmation: 'no',
        firstName: 'Jane',
        lastName: 'Doe',
      });
      expect(res.redirect).toHaveBeenCalledWith(303, '/next-step');
    });
  });
});
