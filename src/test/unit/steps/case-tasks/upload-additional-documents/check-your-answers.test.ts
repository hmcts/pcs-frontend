jest.mock('@modules/steps', () => ({
  createGetController: jest.fn((_view, _step, _nav, fn) => fn),
  createStepNavigation: jest.fn(() => ({
    getNextStepUrl: jest.fn().mockResolvedValue('/documents-uploaded'),
  })),
  getFormData: jest.fn(),
}));

jest.mock('@modules/documents/storage', () => ({
  sessionDocs: jest.fn(() => ({
    read: jest.fn().mockResolvedValue([]),
    save: jest.fn(),
  })),
  toDisplayDocuments: jest.fn(() => []),
}));

jest.mock('@services/ccdCaseService', () => ({
  ccdCaseService: {
    submitUploadDocuments: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('@steps', () => ({
  getFlowConfigForJourney: jest.fn(),
}));

jest.mock('@modules/logger', () => {
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  return { Logger: { getLogger: jest.fn(() => logger) } };
});

jest.mock('@routes/dashboard', () => ({
  getDashboardUrl: jest.fn(),
}));

import type { Request, Response } from 'express';

import { step } from '../../../../../main/steps/case-tasks/upload-additional-documents/check-your-answers';

import { sessionDocs } from '@modules/documents/storage';
import { getFormData } from '@modules/steps';
import { ccdCaseService } from '@services/ccdCaseService';

const mockSubmit = ccdCaseService.submitUploadDocuments as jest.Mock;
const mockGetFormData = getFormData as jest.Mock;
const storage = (sessionDocs as jest.Mock).mock.results[0]?.value as { read: jest.Mock; save: jest.Mock } | undefined;

const CASE_REF = '1234567890123456';

const buildReq = (uploadedDocs: unknown[] = []): Request =>
  ({
    session: { user: { accessToken: 'tok' }, uploadedDocs: {} },
    res: { locals: { validatedCase: { id: CASE_REF } } },
    params: { caseReference: CASE_REF },
    body: {},
    _uploaded: uploadedDocs,
  }) as unknown as Request;

const buildRes = (): Response => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res as Response);
  res.render = jest.fn().mockReturnValue(res as Response);
  res.redirect = jest.fn().mockReturnValue(res as Response);
  return res as Response;
};

beforeEach(() => {
  jest.clearAllMocks();
  if (storage) {
    storage.read.mockResolvedValue([{ id: 'doc-1', value: { document: { document_filename: 'f.pdf' } } }]);
  }
});

describe('upload-additional-documents check-your-answers POST', () => {
  it('omits selectedRelatedApplicationId when the sentinel was chosen', async () => {
    mockGetFormData.mockReturnValue({ relatedApplicationId: 'MAIN_CLAIM_OR_COUNTERCLAIM' });

    await step.postController!.post!(buildReq(), buildRes(), jest.fn());

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    const [, payload] = mockSubmit.mock.calls[0];
    expect(payload.data.selectedRelatedApplicationId).toBeUndefined();
    expect(payload.data.uploadedAdditionalDocuments).toHaveLength(1);
  });

  it('includes selectedRelatedApplicationId when a gen-app was chosen', async () => {
    const genAppId = '11111111-1111-1111-1111-111111111111';
    mockGetFormData.mockReturnValue({ relatedApplicationId: genAppId });

    await step.postController!.post!(buildReq(), buildRes(), jest.fn());

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    const [, payload] = mockSubmit.mock.calls[0];
    expect(payload.data.selectedRelatedApplicationId).toBe(genAppId);
  });

  it('omits selectedRelatedApplicationId when no selection exists (no-gen-app flow path)', async () => {
    mockGetFormData.mockReturnValue(undefined);

    await step.postController!.post!(buildReq(), buildRes(), jest.fn());

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    const [, payload] = mockSubmit.mock.calls[0];
    expect(payload.data.selectedRelatedApplicationId).toBeUndefined();
  });
});
