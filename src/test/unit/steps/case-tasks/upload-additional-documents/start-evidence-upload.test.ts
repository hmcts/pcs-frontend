jest.mock('../../../../../main/modules/steps/i18n', () => ({
  loadStepNamespace: jest.fn(),
  getStepTranslations: jest.fn(() => ({})),
  getTranslationFunction: jest.fn(() => (key: string) => key),
}));

jest.mock('../../../../../main/modules/i18n', () => ({
  getRequestLanguage: jest.fn(() => 'en'),
  getCommonTranslations: jest.fn(() => ({})),
}));

type NavMocks = { getBackUrl: jest.Mock; getNextStepUrl: jest.Mock };

jest.mock('../../../../../main/modules/steps/flow', () => {
  const navigation: NavMocks = {
    getBackUrl: jest.fn(async () => '/back-from-flow'),
    getNextStepUrl: jest.fn(async () => '/case/123/upload-additional-documents/upload-your-documents'),
  };

  const globalCtx = globalThis as typeof globalThis & { __startEvidenceUploadNavMocks?: NavMocks };
  globalCtx.__startEvidenceUploadNavMocks = navigation;

  return {
    ...jest.requireActual('../../../../../main/modules/steps/flow'),
    createStepNavigation: jest.fn(() => navigation),
  };
});

import type { NextFunction, Request, Response } from 'express';
import type { Environment } from 'nunjucks';

import { step } from '../../../../../main/steps/case-tasks/upload-additional-documents/start-evidence-upload';

function navigationMocks(): NavMocks {
  const nav = (globalThis as typeof globalThis & { __startEvidenceUploadNavMocks?: NavMocks })
    .__startEvidenceUploadNavMocks;
  if (!nav) {
    throw new Error('start-evidence-upload tests: navigation mocks not initialised');
  }
  return nav;
}

type CreateReqOverrides = Partial<{
  body: Request['body'];
  originalUrl: string;
  query: Request['query'];
  params: Request['params'];
  session: Request['session'] & { ccdCase?: { id: string } };
  app: Request['app'];
  i18n: { getResourceBundle: jest.Mock };
  res: { locals: { validatedCase?: { id?: string } } };
}>;

function createReq(overrides: CreateReqOverrides = {}): Request {
  const nunjucksEnv = { render: jest.fn() } as unknown as Environment;

  return {
    body: {},
    originalUrl: '/case/1234567890123456/upload-additional-documents/start-evidence-upload',
    query: { lang: 'en' },
    params: { caseReference: '1234567890123456' },
    session: { formData: {}, ccdCase: { id: '1234567890123456' } },
    app: { locals: { nunjucksEnv } },
    i18n: { getResourceBundle: jest.fn(() => ({})) },
    ...overrides,
  } as unknown as Request;
}

function createGetResponse(): Response {
  return {
    render: jest.fn(),
    locals: {},
  } as unknown as Response;
}

function createPostResponse(): Response {
  return {
    redirect: jest.fn(),
    status: jest.fn(),
    render: jest.fn(),
  } as unknown as Response;
}

function createPostResponseWithStatusChain(): Response {
  return {
    redirect: jest.fn(),
    status: jest.fn().mockReturnThis(),
    render: jest.fn(),
  } as unknown as Response;
}

describe('start-evidence-upload step', () => {
  const next: NextFunction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    const nav = navigationMocks();
    nav.getNextStepUrl.mockResolvedValue('/case/123/upload-additional-documents/upload-your-documents');
    nav.getBackUrl.mockResolvedValue('/back-from-flow');
  });

  it('exposes correct step name, url, and view', () => {
    expect(step.name).toBe('start-evidence-upload');
    expect(step.url).toBe('/case/:caseReference/upload-additional-documents/start-evidence-upload');
    expect(step.view).toContain('startEvidenceUpload.njk');
  });

  it('GET renders with dashboard links and route url when case id is present', async () => {
    const controller = typeof step.getController === 'function' ? step.getController() : step.getController;

    const req = createReq({
      res: {
        locals: {
          validatedCase: { id: '1234567890123456' },
        },
      },
    });

    const res = createGetResponse();

    await controller.get(req, res);

    expect(res.render).toHaveBeenCalledWith(
      step.view,
      expect.objectContaining({
        pageUrl: '/case/1234567890123456/upload-additional-documents/start-evidence-upload',
        backUrl: '/dashboard/1234567890123456',
        dashboardUrl: '/dashboard/1234567890123456',
        url: '/case/1234567890123456/upload-additional-documents/start-evidence-upload',
      })
    );
  });

  it('GET uses /dashboard fallback for backUrl when case id is missing', async () => {
    const controller = typeof step.getController === 'function' ? step.getController() : step.getController;

    const req = createReq({
      res: {
        locals: {},
      },
    });

    const res = createGetResponse();

    await controller.get(req, res);

    expect(res.render).toHaveBeenCalledWith(
      step.view,
      expect.objectContaining({
        backUrl: '/dashboard',
        dashboardUrl: null,
      })
    );
  });

  it('POST redirects using next-step url from navigation', async () => {
    const req = createReq({ res: { locals: {} } });

    const res = createPostResponse();

    if (!step.postController) {
      throw new Error('expected postController');
    }
    await step.postController.post(req, res, next);

    expect(navigationMocks().getNextStepUrl).toHaveBeenCalledWith(req, 'start-evidence-upload');
    expect(res.redirect).toHaveBeenCalledWith(303, '/case/123/upload-additional-documents/upload-your-documents');
  });

  it('POST renders not-found when navigation returns no url', async () => {
    navigationMocks().getNextStepUrl.mockResolvedValue(undefined);

    const req = createReq({ res: { locals: {} } });

    const res = createPostResponseWithStatusChain();

    if (!step.postController) {
      throw new Error('expected postController');
    }
    await step.postController.post(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.render).toHaveBeenCalledWith('not-found');
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
