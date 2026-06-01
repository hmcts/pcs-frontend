jest.mock('../../../../../main/modules/steps/upload-additional-documents/submitUploadAdditionalDocuments', () => ({
  submitUploadAdditionalDocuments: jest.fn(),
}));

jest.mock('../../../../../main/modules/steps/upload-additional-documents/buildUploadDocumentsPayload', () => ({
  buildUploadDocumentsPayload: jest.fn(),
  clearUploadAdditionalDocumentsSession: jest.fn(),
}));

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
    getBackUrl: jest.fn(async () => '/back'),
    getNextStepUrl: jest.fn(async () => '/case/1234567890123456/upload-additional-documents/documents-uploaded'),
  };

  const globalCtx = globalThis as typeof globalThis & { __uploadCyaNavMocks?: NavMocks };
  globalCtx.__uploadCyaNavMocks = navigation;

  return {
    ...jest.requireActual('../../../../../main/modules/steps/flow'),
    createStepNavigation: jest.fn(() => navigation),
  };
});

import type { NextFunction, Request, Response } from 'express';

import {
  buildUploadDocumentsPayload,
  clearUploadAdditionalDocumentsSession,
} from '../../../../../main/modules/steps/upload-additional-documents/buildUploadDocumentsPayload';
import { submitUploadAdditionalDocuments } from '../../../../../main/modules/steps/upload-additional-documents/submitUploadAdditionalDocuments';
import { step } from '../../../../../main/steps/case-tasks/upload-additional-documents/check-your-answers';

const CASE_ID = '1234567890123456';

function createPostReq(): Request {
  return {
    params: { caseReference: CASE_ID },
    session: { user: { accessToken: 'token-123' } },
    res: { locals: { validatedCase: { id: CASE_ID } } },
  } as unknown as Request;
}

function createPostRes(): Response {
  return {
    redirect: jest.fn(),
    status: jest.fn().mockReturnThis(),
    render: jest.fn(),
  } as unknown as Response;
}

describe('upload-additional-documents check-your-answers POST', () => {
  const next = jest.fn() as NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    (buildUploadDocumentsPayload as jest.Mock).mockResolvedValue({ uploadedAdditionalDocuments: [] });
    (submitUploadAdditionalDocuments as jest.Mock).mockResolvedValue(undefined);
  });

  it('submits uploadDocuments to CCD and redirects to documents-uploaded', async () => {
    const req = createPostReq();
    const res = createPostRes();
    const payload = { uploadedAdditionalDocuments: [] };
    (buildUploadDocumentsPayload as jest.Mock).mockResolvedValue(payload);

    await step.postController!.post(req, res, next);

    expect(buildUploadDocumentsPayload).toHaveBeenCalledWith(req);
    expect(submitUploadAdditionalDocuments).toHaveBeenCalledWith('token-123', CASE_ID, payload);
    expect(clearUploadAdditionalDocumentsSession).toHaveBeenCalledWith(req);
    expect(res.redirect).toHaveBeenCalledWith(
      303,
      '/case/1234567890123456/upload-additional-documents/documents-uploaded'
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 404 when case is missing', async () => {
    const req = createPostReq();
    const reqWithRes = req as unknown as Request & { res: { locals: { validatedCase?: { id: string } } } };
    delete reqWithRes.res.locals.validatedCase;
    const res = createPostRes();

    await step.postController!.post(req, res, next);

    expect(submitUploadAdditionalDocuments).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Case not found', status: 404 }));
  });

  it('forwards errors from submit', async () => {
    const req = createPostReq();
    const res = createPostRes();
    const error = new Error('CCD failed');
    (submitUploadAdditionalDocuments as jest.Mock).mockRejectedValue(error);

    await step.postController!.post(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
