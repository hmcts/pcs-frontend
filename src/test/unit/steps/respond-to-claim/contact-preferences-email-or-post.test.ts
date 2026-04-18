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
}));

jest.mock('../../../../main/services/ccdCaseService', () => ({
  ccdCaseService: {
    saveDraftDefendantResponse: jest.fn(),
  },
}));

import { ccdCaseService } from '../../../../main/services/ccdCaseService';
import { step } from '../../../../main/steps/respond-to-claim/contact-preferences-email-or-post';

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

  it('saves with fields deleted when session formData is empty (holistic draft save reads from session)', async () => {
    const { req, res, next } = createBaseReqRes();
    req.body = {
      contactByEmailOrPost: 'email',
      'contactByEmailOrPost.email': 'new@example.com',
    };

    const post = step.postController?.post;
    expect(post).toBeDefined();
    await post!(req, res, next);

    // beforeRedirect reads from req.session.formData which is empty,
    // so the else branch runs, deleting preferenceType and emailAddress
    expect(ccdCaseService.saveDraftDefendantResponse).toHaveBeenCalledWith(
      undefined, // accessToken
      '123', // caseId
      {
        defendantResponses: {},
        defendantContactDetails: { party: {} },
      }
    );
  });

  it('builds CCD payload when session formData has email selection', async () => {
    const { req, res, next } = createBaseReqRes();
    req.body = {
      contactByEmailOrPost: 'email',
      'contactByEmailOrPost.email': 'new@example.com',
    };
    req.session.formData = {
      'contact-preferences-email-or-post': {
        contactByEmailOrPost: 'email',
        'contactByEmailOrPost.email': 'new@example.com',
      },
    };

    const post = step.postController?.post;
    expect(post).toBeDefined();
    await post!(req, res, next);

    expect(ccdCaseService.saveDraftDefendantResponse).toHaveBeenCalledWith(
      undefined, // accessToken
      '123', // caseId
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

  it('clears email when session formData has post selection', async () => {
    const { req, res, next } = createBaseReqRes();
    req.body = {
      contactByEmailOrPost: 'post',
    };
    req.session.formData = {
      'contact-preferences-email-or-post': {
        contactByEmailOrPost: 'post',
      },
    };

    const post = step.postController?.post;
    expect(post).toBeDefined();
    await post!(req, res, next);

    expect(ccdCaseService.saveDraftDefendantResponse).toHaveBeenCalledWith(
      undefined, // accessToken
      '123', // caseId
      expect.objectContaining({
        defendantResponses: expect.objectContaining({
          preferenceType: 'POST',
        }),
      })
    );
  });
});
