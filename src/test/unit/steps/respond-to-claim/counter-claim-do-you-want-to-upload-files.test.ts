import type { Request, Response } from 'express';

import { step } from '../../../../main/steps/respond-to-claim/counter-claim-do-you-want-to-upload-files';
import { saveDraftDefendantResponse } from '../../../../main/steps/utils/buildDraftDefendantResponse';

jest.mock('../../../../main/modules/i18n', () => ({
  getTranslationFunction: jest.fn(() => jest.fn((key: string) => key)),
  loadStepNamespace: jest.fn(),
  getRequestLanguage: jest.fn(() => 'en'),
  getCommonTranslations: jest.fn(() => ({})),
  getStepTranslations: jest.fn(() => ({})),
}));

jest.mock('../../../../main/steps/utils/buildDraftDefendantResponse', () => ({
  buildDraftDefendantResponse: jest.fn(() => ({
    defendantResponses: {},
    defendantContactDetails: { party: {} },
  })),
  saveDraftDefendantResponse: jest.fn(),
}));

describe('counter-claim-do-you-want-to-upload-files submit-time CCD payloads', () => {
  const createBaseReqRes = () => {
    const req = {
      body: {},
      session: { formData: {} },
      app: {
        locals: {
          nunjucksEnv: { render: jest.fn() },
        },
      },
      res: {
        locals: {
          validatedCase: { id: '123', data: {} },
        },
      },
    } as unknown as Request;

    const res = {
      redirect: jest.fn(),
      render: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as Response;

    const next = jest.fn();

    return { req, res, next };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists YES when user wants to upload files', async () => {
    const { req, res, next } = createBaseReqRes();
    req.body = { counterClaimWantToUploadFiles: 'YES' };

    const post = step.postController?.post;
    expect(post).toBeDefined();

    await post!(req, res, next);

    expect(saveDraftDefendantResponse).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        defendantResponses: expect.objectContaining({
          counterClaimWantToUploadFiles: 'YES',
        }),
      })
    );
  });

  it('persists NO when user does not want to upload files', async () => {
    const { req, res, next } = createBaseReqRes();
    req.body = { counterClaimWantToUploadFiles: 'NO' };

    const post = step.postController?.post;
    expect(post).toBeDefined();

    await post!(req, res, next);

    expect(saveDraftDefendantResponse).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        defendantResponses: expect.objectContaining({
          counterClaimWantToUploadFiles: 'NO',
        }),
      })
    );
  });

  it('still calls saveDraftDefendantResponse when body has no value', async () => {
    const { req, res, next } = createBaseReqRes();
    req.body = {};

    const post = step.postController?.post;
    expect(post).toBeDefined();

    await post!(req, res, next);

    expect(saveDraftDefendantResponse).toHaveBeenCalled();
  });
});
