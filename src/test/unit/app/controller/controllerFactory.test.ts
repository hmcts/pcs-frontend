import type { Request } from 'express';
import type { TFunction } from 'i18next';

import {
  GetController,
  createGetController,
  createPostController,
  createPostRedirectController,
} from '../../../../main/modules/steps/controller';

const mockGetFormData = jest.fn();
const mockSetFormData = jest.fn();
const mockValidateForm = jest.fn();

jest.mock('../../../../main/modules/steps/formBuilder/helpers', () => ({
  getFormData: (...args: unknown[]) => mockGetFormData(...args),
  setFormData: (...args: unknown[]) => mockSetFormData(...args),
  validateForm: (...args: unknown[]) => mockValidateForm(...args),
}));

const mockGetRequestLanguage = jest.fn();
const mockGetTranslationFunction = jest.fn();

jest.mock('../../../../main/modules/steps/i18n', () => ({
  getValidatedLanguage: jest.fn(() => 'en'),
  getRequestLanguage: (...args: unknown[]) => mockGetRequestLanguage(...args),
  getTranslationFunction: (...args: unknown[]) => mockGetTranslationFunction(...args),
  getStepNamespace: jest.fn((stepName: string) => stepName),
  getStepTranslations: jest.fn(() => ({})),
  loadStepNamespace: jest.fn(),
}));
jest.mock('../../../../main/modules/steps/flow', () => ({
  stepNavigation: {
    getBackUrl: jest.fn(() => Promise.resolve(null)),
    getNextStepUrl: jest.fn(() => Promise.resolve('/next-step')),
  },
}));
describe('createGetController', () => {
  const mockContent = {
    serviceName: 'Test Service',
    title: 'Test Page',
  };

  const stepName = 'page1';
  const viewPath = 'steps/page1.njk';

  const mockExtendContent = jest.fn((_req: Request) => mockContent);

  beforeEach(() => {
    jest.clearAllMocks();
    mockExtendContent.mockReturnValue(mockContent);
    mockGetRequestLanguage.mockImplementation((req: Request) => req.language || 'en');
    mockGetTranslationFunction.mockImplementation((req: Request) => {
      // Use req.t if available, otherwise create a mock that returns values different from keys
      // so getCommonTranslations will include them
      if (req.t) {
        return req.t as TFunction;
      }
      return jest.fn((key: string) => {
        // Return actual values for common translation keys (values must differ from keys)
        const commonKeys: Record<string, string> = {
          serviceName: 'Test Service',
          phase: 'ALPHA', // Different from key
          feedback: 'Feedback text', // Different from key
          back: 'Back', // Different from key
          languageToggle: 'Language toggle', // Different from key
          contactUsForHelp: 'Contact us', // Different from key
          contactUsForHelpText: 'Contact text', // Different from key
        };
        return commonKeys[key] || key;
      }) as unknown as TFunction;
    });
  });

  it('should merge content with form data from session when available', async () => {
    const mockT = jest.fn((key: string) => {
      // Return actual translation values for common keys
      const translations: Record<string, string> = {
        serviceName: 'Test Service',
        phase: 'ALPHA',
        feedback: 'Feedback text',
        back: 'Back',
        languageToggle: 'Language toggle',
      };
      return translations[key] || key;
    });
    const req = {
      body: {},
      originalUrl: '/',
      query: { lang: 'en' },
      language: 'en',
      session: { formData: { [stepName]: { answer: 'sessionAnswer', choices: ['choice1'] } } },
      t: mockT,
      i18n: undefined,
    } as unknown as Request;

    const res = { render: jest.fn() } as any;

    mockGetFormData.mockReturnValue({ answer: 'sessionAnswer', choices: ['choice1'] });

    const controller = createGetController(viewPath, stepName, mockExtendContent);
    await controller.get(req, res);

    expect(mockExtendContent).toHaveBeenCalledWith(req);
    expect(mockGetFormData).toHaveBeenCalledWith(req, 'page1');
    expect(res.render).toHaveBeenCalledWith(
      viewPath,
      expect.objectContaining({
        ...mockContent,
        selected: 'sessionAnswer',
        answer: 'sessionAnswer',
        choices: ['choice1'],
        lang: 'en',
        pageUrl: '/',
        backUrl: null,
        serviceName: 'Test Service',
        phase: 'ALPHA',
        feedback: 'Feedback text',
        back: 'Back',
        languageToggle: 'Language toggle',
      })
    );
  });

  it('should prioritize post data over session data', async () => {
    const mockT = jest.fn((key: string) => {
      const translations: Record<string, string> = {
        serviceName: 'Test Service',
        phase: 'ALPHA',
        feedback: 'Feedback text',
        back: 'Back',
        languageToggle: 'Language toggle',
      };
      return translations[key] || key;
    }) as unknown as TFunction;
    const req = {
      body: { answer: 'postAnswer', error: 'Test error' },
      originalUrl: '/',
      query: { lang: 'en' },
      language: 'en',
      session: { formData: { [stepName]: { answer: 'sessionAnswer' } } },
      t: mockT,
      i18n: undefined,
    } as unknown as Request;

    const res = { render: jest.fn() } as any;

    mockGetFormData.mockReturnValue({ answer: 'sessionAnswer' });

    const controller = createGetController(viewPath, stepName, mockExtendContent);
    await controller.get(req, res);

    expect(mockExtendContent).toHaveBeenCalledWith(req);
    expect(res.render).toHaveBeenCalledWith(
      viewPath,
      expect.objectContaining({
        ...mockContent,
        selected: 'sessionAnswer',
        answer: 'postAnswer',
        error: 'Test error',
        lang: 'en',
        pageUrl: '/',
        backUrl: null,
        serviceName: 'Test Service',
        phase: 'ALPHA',
        feedback: 'Feedback text',
        back: 'Back',
        languageToggle: 'Language toggle',
      })
    );
  });

  it('should handle undefined req.body', async () => {
    const mockT = jest.fn((key: string) => {
      const translations: Record<string, string> = {
        serviceName: 'Test Service',
        phase: 'ALPHA',
        feedback: 'Feedback text',
        back: 'Back',
        languageToggle: 'Language toggle',
      };
      return translations[key] || key;
    }) as unknown as TFunction;
    const req = {
      originalUrl: '/',
      query: { lang: 'en' },
      language: 'en',
      session: {},
      t: mockT,
      i18n: undefined,
    } as unknown as Request;

    const res = { render: jest.fn() } as any;

    mockGetFormData.mockReturnValue({});

    const controller = createGetController(viewPath, stepName, mockExtendContent);
    await controller.get(req, res);

    expect(mockExtendContent).toHaveBeenCalledWith(req);
    expect(res.render).toHaveBeenCalledWith(
      viewPath,
      expect.objectContaining({
        ...mockContent,
        lang: 'en',
        pageUrl: '/',
        backUrl: null,
        serviceName: 'Test Service',
        phase: 'ALPHA',
        feedback: 'Feedback text',
        back: 'Back',
        languageToggle: 'Language toggle',
      })
    );
  });

  it('should call extendContent when provided', async () => {
    const mockT = jest.fn((key: string) => key);
    const req = {
      body: {},
      originalUrl: '/',
      query: { lang: 'en' },
      language: 'en',
      session: {},
      t: mockT,
      i18n: undefined,
    } as unknown as Request;

    const res = { render: jest.fn() } as any;

    const extendContent = jest.fn((_req: Request) => ({ extended: true, ...mockContent }));
    mockGetFormData.mockReturnValue({});

    const controller = createGetController(viewPath, stepName, extendContent);
    await controller.get(req, res);

    expect(extendContent).toHaveBeenCalledWith(req);
    expect(res.render).toHaveBeenCalledWith(
      viewPath,
      expect.objectContaining({
        extended: true,
      })
    );
  });
});

describe('GetController', () => {
  it('should render view with generated content', async () => {
    const mockGenerateContent = jest.fn(() => ({ title: 'Test' }));
    const controller = new GetController('test.njk', mockGenerateContent);
    const req = {} as Request;

    const res = { render: jest.fn() } as any;

    await controller.get(req, res);

    expect(mockGenerateContent).toHaveBeenCalledWith(req);
    expect(res.render).toHaveBeenCalledWith('test.njk', { title: 'Test' });
  });
});

describe('createPostRedirectController', () => {
  it('should redirect to provided URL', () => {
    const controller = createPostRedirectController('/redirect-url');
    const req = {} as Request;

    const res = { redirect: jest.fn() } as any;

    controller.post(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/redirect-url');
  });
});

describe('createPostController', () => {
  const stepName = 'test-step';
  const view = 'steps/test.njk';
  const mockGetFields = jest.fn(() => []);

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateForm.mockReturnValue({});
    mockGetFields.mockReturnValue([]);
  });

  it('should validate form and return errors when validation fails', async () => {
    const errors = { field1: 'Error message' };
    mockValidateForm.mockReturnValue(errors);
    const mockT = jest.fn((key: string) => key);

    const controller = createPostController(stepName, mockGetFields, view);
    const req = {
      body: { field1: '' },
      language: 'en',
      originalUrl: '/',
      session: {},
      t: mockT,
      i18n: undefined,
    } as unknown as Request;

    const res = { status: jest.fn().mockReturnThis(), render: jest.fn() } as any;
    const next = jest.fn();

    await controller.post(req, res, next);

    expect(mockValidateForm).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith(
      view,
      expect.objectContaining({
        field1: '',
        error: { field: 'field1', text: 'Error message' },
        lang: 'en',
        pageUrl: '/',
        backUrl: null,
      })
    );
  });

  it('should save form data and redirect when validation passes', async () => {
    const { stepNavigation } = require('../../../../main/modules/steps/flow');
    const mockT = jest.fn((key: string) => key);
    const controller = createPostController(stepName, mockGetFields, view);
    const req = {
      body: { field1: 'value1' },
      language: 'en',
      session: {},
      t: mockT,
      i18n: undefined,
    } as unknown as Request;

    const res = { redirect: jest.fn() } as any;
    const next = jest.fn();

    await controller.post(req, res, next);

    expect(mockSetFormData).toHaveBeenCalledWith(req, stepName, { field1: 'value1' });
    expect(stepNavigation.getNextStepUrl).toHaveBeenCalledWith(req, stepName, { field1: 'value1' });
    expect(res.redirect).toHaveBeenCalledWith(303, '/next-step');
  });

  it('should execute beforeRedirect callback when provided', async () => {
    const mockT = jest.fn((key: string) => key);
    const beforeRedirect = jest.fn();
    const controller = createPostController(stepName, mockGetFields, view, beforeRedirect);
    const req = {
      body: { field1: 'value1' },
      language: 'en',
      session: {},
      t: mockT,
      i18n: undefined,
    } as unknown as Request;

    const res = { redirect: jest.fn(), headersSent: false } as any;
    const next = jest.fn();

    await controller.post(req, res, next);

    expect(beforeRedirect).toHaveBeenCalledWith(req, res);
  });

  it('should not redirect if beforeRedirect sends response', async () => {
    const mockT = jest.fn((key: string) => key);
    const beforeRedirect = jest.fn();
    const controller = createPostController(stepName, mockGetFields, view, beforeRedirect);
    const req = {
      body: { field1: 'value1' },
      language: 'en',
      session: {},
      t: mockT,
      i18n: undefined,
    } as unknown as Request;

    const res = { redirect: jest.fn(), headersSent: true } as any;
    const next = jest.fn();

    await controller.post(req, res, next);

    expect(beforeRedirect).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('should return 500 when next step cannot be determined', async () => {
    const { stepNavigation } = require('../../../../main/modules/steps/flow');
    stepNavigation.getNextStepUrl.mockResolvedValue(null);
    const mockT = jest.fn((key: string) => key);

    const controller = createPostController(stepName, mockGetFields, view);
    const req = {
      body: { field1: 'value1' },
      language: 'en',
      session: {},
      t: mockT,
      i18n: undefined,
    } as unknown as Request;

    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() } as any;
    const next = jest.fn();

    await controller.post(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('Unable to determine next step');
  });
});
