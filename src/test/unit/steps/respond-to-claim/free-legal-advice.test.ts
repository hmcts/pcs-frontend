import type { NextFunction } from 'express';
import type { Environment } from 'nunjucks';

const mockTranslations: Record<string, string> = {
  pageTitle: 'Free legal advice',
  heading: 'Free legal advice',
  caption: 'Respond to a property possession claim',
  question: 'Have you received free legal advice about your possession claim?',
  'options.yes': 'Yes',
  'options.no': 'No',
  'options.or': 'or',
  'options.preferNotToSay': 'Prefer not to say',
  'errors.hadLegalAdvice.required': 'Select if you have received free legal advice',
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
import { step } from '../../../../main/steps/respond-to-claim/free-legal-advice';

describe('free-legal-advice', () => {
  const nunjucksEnv = { render: jest.fn() } as unknown as Environment;

  const mockCCDCase = (receivedFreeLegalAdvice?: 'YES' | 'NO' | 'PREFER_NOT_TO_SAY') => ({
    data: {
      possessionClaimResponse: {
        defendantResponses: {
          receivedFreeLegalAdvice,
        },
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockReq = (overrides = {}): any => ({
    body: {},
    originalUrl: '/respond-to-claim/free-legal-advice',
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
      expect(step.name).toBe('free-legal-advice');
      expect(step.url).toBe('/case/:caseReference/respond-to-claim/free-legal-advice');
      expect(step.view).toContain('freeLegalAdvice.njk');
    });
  });

  describe('GET', () => {
    it('renders form with correct content', async () => {
      const controller = typeof step.getController === 'function' ? step.getController() : step.getController;
      const res = mockRes();

      await controller.get(mockReq(), res);

      expect(res.render).toHaveBeenCalledWith(
        step.view,
        expect.objectContaining({
          pageTitle: 'Free legal advice',
          heading: 'Free legal advice',
          caption: 'Respond to a property possession claim',
          dashboardUrl: '/dashboard/1234567890123456',
          cancel: 'Cancel',
          backUrl: '/previous-step',
          fields: expect.any(Array),
        })
      );
    });

    it('prepopulates radio button when CCD has YES', async () => {
      const controller = typeof step.getController === 'function' ? step.getController() : step.getController;
      const req = mockReq({ res: { locals: { validatedCase: mockCCDCase('YES') } } });
      const res = mockRes();

      await controller.get(req, res);

      const viewModel = (res.render as jest.Mock).mock.calls[0][1];
      const radioField = viewModel.fields.find((f: { name: string }) => f.name === 'hadLegalAdvice');
      const yesOption = radioField.component.items.find((item: { value: string }) => item.value === 'yes');

      expect(yesOption.checked).toBe(true);
    });

    it('prepopulates radio button when CCD has NO', async () => {
      const controller = typeof step.getController === 'function' ? step.getController() : step.getController;
      const req = mockReq({ res: { locals: { validatedCase: mockCCDCase('NO') } } });
      const res = mockRes();

      await controller.get(req, res);

      const viewModel = (res.render as jest.Mock).mock.calls[0][1];
      const radioField = viewModel.fields.find((f: { name: string }) => f.name === 'hadLegalAdvice');
      const noOption = radioField.component.items.find((item: { value: string }) => item.value === 'no');

      expect(noOption.checked).toBe(true);
    });

    it('prepopulates radio button when CCD has PREFER_NOT_TO_SAY', async () => {
      const controller = typeof step.getController === 'function' ? step.getController() : step.getController;
      const req = mockReq({ res: { locals: { validatedCase: mockCCDCase('PREFER_NOT_TO_SAY') } } });
      const res = mockRes();

      await controller.get(req, res);

      const viewModel = (res.render as jest.Mock).mock.calls[0][1];
      const radioField = viewModel.fields.find((f: { name: string }) => f.name === 'hadLegalAdvice');
      const preferOption = radioField.component.items.find(
        (item: { value: string }) => item.value === 'preferNotToSay'
      );

      expect(preferOption.checked).toBe(true);
    });

    it('does not prepopulate when body data exists (validation error scenario)', async () => {
      const controller = typeof step.getController === 'function' ? step.getController() : step.getController;
      const req = mockReq({
        body: { hadLegalAdvice: 'yes' },
        res: { locals: { validatedCase: mockCCDCase('NO') } },
      });
      const res = mockRes();

      await controller.get(req, res);

      const viewModel = (res.render as jest.Mock).mock.calls[0][1];
      const radioField = viewModel.fields.find((f: { name: string }) => f.name === 'hadLegalAdvice');
      const noOption = radioField.component.items.find((item: { value: string }) => item.value === 'no');

      expect(noOption.checked).toBe(false);
    });
  });

  describe('POST', () => {
    it('renders error when validation fails', async () => {
      (validateForm as jest.Mock).mockReturnValue({ hadLegalAdvice: 'Select if you have received free legal advice' });
      const res = mockRes();

      await step.postController!.post(mockReq({ body: { action: 'continue' } }), res, mockNext());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith(step.view, expect.objectContaining({ errorSummary: expect.anything() }));
    });

    it('saves hadLegalAdvice=yes and redirects', async () => {
      (validateForm as jest.Mock).mockReturnValue({});
      const req = mockReq({ body: { action: 'continue', hadLegalAdvice: 'yes' } });
      const res = mockRes();

      await step.postController!.post(req, res, mockNext());

      expect(req.session.formData['free-legal-advice']).toEqual({ hadLegalAdvice: 'yes' });
      expect(res.redirect).toHaveBeenCalledWith(303, '/next-step');
    });

    it('saves hadLegalAdvice=no and redirects', async () => {
      (validateForm as jest.Mock).mockReturnValue({});
      const req = mockReq({ body: { action: 'continue', hadLegalAdvice: 'no' } });
      const res = mockRes();

      await step.postController!.post(req, res, mockNext());

      expect(req.session.formData['free-legal-advice']).toEqual({ hadLegalAdvice: 'no' });
      expect(res.redirect).toHaveBeenCalledWith(303, '/next-step');
    });

    it('saves hadLegalAdvice=preferNotToSay and redirects', async () => {
      (validateForm as jest.Mock).mockReturnValue({});
      const req = mockReq({ body: { action: 'continue', hadLegalAdvice: 'preferNotToSay' } });
      const res = mockRes();

      await step.postController!.post(req, res, mockNext());

      expect(req.session.formData['free-legal-advice']).toEqual({ hadLegalAdvice: 'preferNotToSay' });
      expect(res.redirect).toHaveBeenCalledWith(303, '/next-step');
    });
  });
});
