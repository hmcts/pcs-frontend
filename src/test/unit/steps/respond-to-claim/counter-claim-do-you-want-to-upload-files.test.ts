import type { Request, Response } from 'express';

import { step } from '../../../../main/steps/respond-to-claim/counter-claim-do-you-want-to-upload-files';
import * as populateModule from '../../../../main/steps/utils/populateResponseToClaimPayloadmap';

import type { CcdCase } from '@services/ccdCase.interface';

jest.mock('../../../../main/modules/i18n', () => ({
  getTranslationFunction: jest.fn(() => jest.fn((key: string) => key)),
  loadStepNamespace: jest.fn(),
}));

describe('counter-claim-do-you-want-to-upload-files submit-time CCD payloads', () => {
  const buildCcdSpy = jest
    .spyOn(populateModule, 'buildCcdCaseForPossessionClaimResponse')
    .mockResolvedValue({} as CcdCase);

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
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as Response;

    const next = jest.fn();

    return { req, res, next };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds CCD payload with YES when user wants to upload files', async () => {
    const { req, res, next } = createBaseReqRes();
    req.body = { counterClaimWantToUploadFiles: 'YES' };

    const post = step.postController?.post;
    expect(post).toBeDefined();

    await post!(req, res, next);

    expect(buildCcdSpy).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        defendantResponses: {
          counterClaimWantToUploadFiles: 'YES',
        },
      })
    );
  });

  it('builds CCD payload with NO when user does not want to upload files', async () => {
    const { req, res, next } = createBaseReqRes();
    req.body = { counterClaimWantToUploadFiles: 'NO' };

    const post = step.postController?.post;
    expect(post).toBeDefined();

    await post!(req, res, next);

    expect(buildCcdSpy).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        defendantResponses: {
          counterClaimWantToUploadFiles: 'NO',
        },
      })
    );
  });

  it('does not call buildCcdCaseForPossessionClaimResponse when body has no value', async () => {
    const { req, res, next } = createBaseReqRes();
    req.body = {};

    const post = step.postController?.post;
    expect(post).toBeDefined();

    await post!(req, res, next);

    expect(buildCcdSpy).not.toHaveBeenCalled();
  });
});
