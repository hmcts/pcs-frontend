import type { Request } from 'express';

import {
  GetController,
  createGetController,
  createPostController,
  createPostRedirectController,
  validateAndStoreForm,
} from '../../../../main/app/controller/controllerFactory';
import { getFormData, setFormData, validateForm } from '../../../../main/app/controller/formHelpers';

jest.mock('../../../../main/app/controller/formHelpers');
jest.mock('../../../../main/app/utils/i18n', () => ({
  getValidatedLanguage: jest.fn(() => 'en'),
}));
jest.mock('../../../../main/app/utils/stepFlow', () => ({
  stepNavigation: {
    getBackUrl: jest.fn(() => null),
    getNextStepUrl: jest.fn(() => '/next-step'),
  },
}));

const mockGetFormData = getFormData as jest.Mock;
const mockSetFormData = setFormData as jest.Mock;
const mockValidateForm = validateForm as jest.Mock;
describe('createGetController', () => {
  const mockContent = {
    serviceName: 'Test Service',
    title: 'Test Page',
  };

  const stepName = 'page1';
  const viewPath = 'steps/page1.njk';

  const mockGenerateContent = jest.fn((_lang?: string) => mockContent);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateContent.mockReturnValue(mockContent);
  });

  it('should merge content with form data from session when available', () => {
    const req = {
      body: {},
      originalUrl: '/',
      query: { lang: 'en' },
      session: { formData: { [stepName]: { answer: 'sessionAnswer', choices: ['choice1'] } } },
    } as unknown as Request;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { render: jest.fn() } as any;

    mockGetFormData.mockReturnValue({ answer: 'sessionAnswer', choices: ['choice1'] });

    const controller = createGetController(viewPath, stepName, mockGenerateContent);
    controller.get(req, res);

    expect(mockGenerateContent).toHaveBeenCalledWith('en');
    expect(mockGetFormData).toHaveBeenCalledWith(req, 'page1');
    expect(res.render).toHaveBeenCalledWith(viewPath, {
      ...mockContent,
      selected: 'sessionAnswer',
      answer: 'sessionAnswer',
      choices: ['choice1'],
      error: undefined,
      lang: 'en',
      pageUrl: '/',
      t: undefined,
      backUrl: null,
    });
  });

  it('should prioritize post data over session data', () => {
    const req = {
      body: { answer: 'postAnswer', error: 'Test error' },
      originalUrl: '/',
      query: { lang: 'en' },
      session: { formData: { [stepName]: { answer: 'sessionAnswer' } } },
    } as unknown as Request;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { render: jest.fn() } as any;

    mockGetFormData.mockReturnValue({ answer: 'sessionAnswer' });

    const controller = createGetController(viewPath, stepName, mockGenerateContent);
    controller.get(req, res);

    expect(mockGenerateContent).toHaveBeenCalledWith('en');
    expect(res.render).toHaveBeenCalledWith(viewPath, {
      ...mockContent,
      selected: 'sessionAnswer',
      answer: 'postAnswer',
      choices: undefined,
      error: 'Test error',
      lang: 'en',
      pageUrl: '/',
      t: undefined,
      backUrl: null,
    });
  });

  it('should handle undefined req.body', () => {
    const req = {
      originalUrl: '/',
      query: { lang: 'en' },
      session: {},
    } as unknown as Request;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { render: jest.fn() } as any;

    mockGetFormData.mockReturnValue({});

    const controller = createGetController(viewPath, stepName, mockGenerateContent);
    controller.get(req, res);

    expect(mockGenerateContent).toHaveBeenCalledWith('en');
    expect(res.render).toHaveBeenCalledWith(viewPath, {
      ...mockContent,
      selected: undefined,
      answer: undefined,
      choices: undefined,
      error: undefined,
      lang: 'en',
      pageUrl: '/',
      t: undefined,
      backUrl: null,
    });
  });

  it('should call extendContent when provided', () => {
    const req = {
      body: {},
      originalUrl: '/',
      query: { lang: 'en' },
      session: {},
    } as unknown as Request;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { render: jest.fn() } as any;

    const extendContent = jest.fn((_req, content) => ({ extended: true, ...content }));
    mockGetFormData.mockReturnValue({});

    const controller = createGetController(viewPath, stepName, mockGenerateContent, extendContent);
    controller.get(req, res);

    expect(extendContent).toHaveBeenCalledWith(req, mockContent);
    expect(res.render).toHaveBeenCalledWith(
      viewPath,
      expect.objectContaining({
        extended: true,
      })
    );
  });
});

describe('GetController', () => {
  it('should render view with generated content', () => {
    const mockGenerateContent = jest.fn(() => ({ title: 'Test' }));
    const controller = new GetController('test.njk', mockGenerateContent);
    const req = {} as Request;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { render: jest.fn() } as any;

    controller.get(req, res);

    expect(mockGenerateContent).toHaveBeenCalledWith(req);
    expect(res.render).toHaveBeenCalledWith('test.njk', { title: 'Test' });
  });
});

describe('createPostRedirectController', () => {
  it('should redirect to provided URL', () => {
    const controller = createPostRedirectController('/redirect-url');
    const req = {} as Request;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;

    controller.post(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/redirect-url');
  });
});

describe('createPostController', () => {
  const stepName = 'test-step';
  const view = 'steps/test.njk';
  const mockGenerateContent = jest.fn(() => ({ title: 'Test' }));
  const mockGetFields = jest.fn(() => []);

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateForm.mockReturnValue({});
    mockGetFields.mockReturnValue([]);
  });

  it('should validate form and return errors when validation fails', async () => {
    const errors = { field1: 'Error message' };
    mockValidateForm.mockReturnValue(errors);

    const controller = createPostController(stepName, mockGenerateContent, mockGetFields, view);
    const req = {
      body: { field1: '' },
      session: {},
    } as unknown as Request;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { status: jest.fn().mockReturnThis(), render: jest.fn() } as any;

    await controller.post(req, res);

    expect(mockValidateForm).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith(view, {
      title: 'Test',
      field1: '',
      error: { field: 'field1', text: 'Error message' },
    });
  });

  it('should save form data and redirect when validation passes', async () => {
    const { stepNavigation } = require('../../../../main/app/utils/stepFlow');
    const controller = createPostController(stepName, mockGenerateContent, mockGetFields, view);
    const req = {
      body: { field1: 'value1' },
      session: {},
    } as unknown as Request;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;

    await controller.post(req, res);

    expect(mockSetFormData).toHaveBeenCalledWith(req, stepName, { field1: 'value1' });
    expect(stepNavigation.getNextStepUrl).toHaveBeenCalledWith(req, stepName, { field1: 'value1' });
    expect(res.redirect).toHaveBeenCalledWith(303, '/next-step');
  });

  it('should execute beforeRedirect callback when provided', async () => {
    const beforeRedirect = jest.fn();
    const controller = createPostController(stepName, mockGenerateContent, mockGetFields, view, beforeRedirect);
    const req = {
      body: { field1: 'value1' },
      session: {},
    } as unknown as Request;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn(), headersSent: false } as any;

    await controller.post(req, res);

    expect(beforeRedirect).toHaveBeenCalledWith(req, res);
  });

  it('should not redirect if beforeRedirect sends response', async () => {
    const beforeRedirect = jest.fn();
    const controller = createPostController(stepName, mockGenerateContent, mockGetFields, view, beforeRedirect);
    const req = {
      body: { field1: 'value1' },
      session: {},
    } as unknown as Request;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn(), headersSent: true } as any;

    await controller.post(req, res);

    expect(beforeRedirect).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('should return 500 when next step cannot be determined', async () => {
    const { stepNavigation } = require('../../../../main/app/utils/stepFlow');
    stepNavigation.getNextStepUrl.mockReturnValue(null);

    const controller = createPostController(stepName, mockGenerateContent, mockGetFields, view);
    const req = {
      body: { field1: 'value1' },
      session: {},
    } as unknown as Request;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() } as any;

    await controller.post(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('Unable to determine next step');
  });
});

describe('validateAndStoreForm', () => {
  const stepName = 'test-step';
  const fields = [
    { name: 'field1', type: 'text' as const, required: true },
    { name: 'field2', type: 'text' as const, required: false },
  ];
  const content = { title: 'Test' };
  const templatePath = 'steps/test.njk';

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateForm.mockReturnValue({});
  });

  it('should render error when validation fails', () => {
    const errors = { field1: 'Error message' };
    mockValidateForm.mockReturnValue(errors);

    const controller = validateAndStoreForm(stepName, fields, '/next', content, templatePath);
    const req = {
      body: { field1: '' },
      session: {},
    } as unknown as Request;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { status: jest.fn().mockReturnThis(), render: jest.fn() } as any;

    controller.post(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith(templatePath, {
      title: 'Test',
      field1: '',
      error: 'Error message',
    });
  });

  it('should use default template path when not provided', () => {
    const errors = { field1: 'Error message' };
    mockValidateForm.mockReturnValue(errors);

    const controller = validateAndStoreForm(stepName, fields, '/next', content);
    const req = {
      body: { field1: '' },
      session: {},
    } as unknown as Request;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { status: jest.fn().mockReturnThis(), render: jest.fn() } as any;

    controller.post(req, res);

    expect(res.render).toHaveBeenCalledWith('steps/test-step.njk', expect.any(Object));
  });

  it('should convert single checkbox value to array', () => {
    const checkboxFields = [{ name: 'checkbox1', type: 'checkbox' as const, required: false }];
    const controller = validateAndStoreForm(stepName, checkboxFields, '/next');
    const req = {
      body: { checkbox1: 'value1' },
      session: {},
    } as unknown as Request;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;

    controller.post(req, res);

    expect(req.body.checkbox1).toEqual(['value1']);
    expect(mockSetFormData).toHaveBeenCalled();
  });

  it('should redirect to static URL', () => {
    const controller = validateAndStoreForm(stepName, fields, '/next-page');
    const req = {
      body: { field1: 'value1' },
      session: {},
    } as unknown as Request;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;

    controller.post(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/next-page');
  });

  it('should redirect to dynamic URL from function', () => {
    const nextPageFn = jest.fn(body => `/next/${body.field1}`);
    const controller = validateAndStoreForm(stepName, fields, nextPageFn);
    const req = {
      body: { field1: 'value1' },
      session: {},
    } as unknown as Request;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;

    controller.post(req, res);

    expect(nextPageFn).toHaveBeenCalledWith({ field1: 'value1' });
    expect(res.redirect).toHaveBeenCalledWith('/next/value1');
  });
});
