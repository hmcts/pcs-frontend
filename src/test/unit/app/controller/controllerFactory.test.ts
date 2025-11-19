import type { Request } from 'express';

import { createGetController } from '../../../../main/app/controller/controllerFactory';
import { getFormData } from '../../../../main/app/controller/formHelpers';

jest.mock('../../../../main/app/controller/formHelpers');
jest.mock('../../../../main/app/utils/i18n', () => ({
  getValidatedLanguage: jest.fn(() => 'en'),
}));
jest.mock('../../../../main/app/utils/stepFlow', () => ({
  stepNavigation: {
    getBackUrl: jest.fn(() => null),
  },
}));

const mockGetFormData = getFormData as jest.Mock;
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
});
