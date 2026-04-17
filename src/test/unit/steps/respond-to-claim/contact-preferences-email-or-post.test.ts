import type { Request, Response } from 'express';

import { step } from '../../../../main/steps/respond-to-claim/contact-preferences-email-or-post';
import * as populateModule from '../../../../main/steps/utils/populateResponseToClaimPayloadmap';

import type { CcdCase } from '@services/ccdCase.interface';

jest.mock('../../../../main/modules/i18n', () => ({
  getTranslationFunction: jest.fn(() => jest.fn((key: string) => key)),
  loadStepNamespace: jest.fn(),
}));

describe('contact-preferences-email-or-post', () => {
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

  it('builds CCD payload from current body when user selects email', async () => {
    const { req, res, next } = createBaseReqRes();
    req.body = {
      contactByEmailOrPost: 'email',
      'contactByEmailOrPost.email': 'new@example.com',
    };

    const post = step.postController?.post;
    expect(post).toBeDefined();
    await post!(req, res, next);

    expect(buildCcdSpy).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        defendantContactDetails: {
          party: {
            emailAddress: 'new@example.com',
          },
        },
        defendantResponses: {
          contactByEmail: 'YES',
          contactByPost: 'NO',
        },
      })
    );
  });

  it('clears existing email when user selects post', async () => {
    const { req, res, next } = createBaseReqRes();
    req.body = {
      contactByEmailOrPost: 'post',
    };

    const post = step.postController?.post;
    expect(post).toBeDefined();
    await post!(req, res, next);

    expect(buildCcdSpy).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        defendantContactDetails: {
          party: {
            emailAddress: '',
          },
        },
        defendantResponses: {
          contactByEmail: 'NO',
          contactByPost: 'YES',
        },
      })
    );
  });
});
