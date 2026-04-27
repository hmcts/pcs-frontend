import type { Request, Response } from 'express';

jest.mock('../../../../main/modules/i18n', () => ({
  getTranslationFunction: jest.fn(() => jest.fn((key: string) => key)),
  loadStepNamespace: jest.fn(),
}));

jest.mock('../../../../main/steps/utils/buildDraftDefendantResponse', () => ({
  buildDraftDefendantResponse: jest.fn(() => ({
    defendantResponses: {},
    defendantContactDetails: { party: {} },
  })),
  saveDraftDefendantResponse: jest.fn(),
}));

import { step } from '../../../../main/steps/respond-to-claim/contact-preferences-email-or-post';
import { saveDraftDefendantResponse } from '../../../../main/steps/utils/buildDraftDefendantResponse';

describe('contact-preferences-email-or-post', () => {
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
            defendantContactDetailsPartyEmailAddress: 'existing@example.com',
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

  it('builds CCD payload when req.body has email selection', async () => {
    const { req, res, next } = createBaseReqRes();
    req.body = {
      contactByEmailOrPost: 'email',
      'contactByEmailOrPost.email': 'new@example.com',
    };

    const post = step.postController?.post;
    expect(post).toBeDefined();
    await post!(req, res, next);

    expect(saveDraftDefendantResponse).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        defendantContactDetails: expect.objectContaining({
          party: expect.objectContaining({
            emailAddress: 'new@example.com',
          }),
        }),
        defendantResponses: expect.objectContaining({
          preferenceType: 'EMAIL',
        }),
      })
    );
  });

  it('clears email when req.body has post selection', async () => {
    const { req, res, next } = createBaseReqRes();
    req.body = {
      contactByEmailOrPost: 'post',
    };

    const post = step.postController?.post;
    expect(post).toBeDefined();
    await post!(req, res, next);

    expect(saveDraftDefendantResponse).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        defendantResponses: expect.objectContaining({
          preferenceType: 'POST',
        }),
      })
    );
  });
});
