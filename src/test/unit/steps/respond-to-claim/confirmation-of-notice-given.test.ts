import type { Request, Response } from 'express';

import { step } from '../../../../main/steps/respond-to-claim/confirmation-of-notice-given';
import * as populateModule from '../../../../main/steps/utils/populateResponseToClaimPayloadmap';

import type { CcdCase } from '@interfaces/ccdCase.interface';

jest.mock('../../../../main/modules/i18n', () => ({
  getTranslationFunction: jest.fn(() => jest.fn((key: string) => key)),
  loadStepNamespace: jest.fn(),
}));

describe('confirmation-of-notice-given step', () => {
  const buildCcdSpy = jest
    .spyOn(populateModule, 'buildCcdCaseForPossessionClaimResponse')
    .mockResolvedValue({} as CcdCase);

  const createBaseReqRes = () => {
    const req = {
      body: {},
      session: {
        formData: {},
      },
      app: {
        locals: {
          nunjucksEnv: {
            render: jest.fn(),
          },
        },
      },
      res: {
        locals: {
          validatedCase: {
            id: '123',
          },
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

  it('persists the selected answer in CCD before redirecting', async () => {
    const { req, res, next } = createBaseReqRes();

    req.body = {
      confirmNoticeGiven: 'imNotSure',
    };

    const post = step.postController?.post;
    expect(post).toBeDefined();

    await post!(req, res, next);

    expect(buildCcdSpy).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        defendantResponses: {
          confirmNoticeGiven: 'NOT_SURE',
        },
      })
    );
  });
});
