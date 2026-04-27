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

import { step as telephoneStep } from '../../../../main/steps/respond-to-claim/contact-preferences-telephone';
import { step as textStep } from '../../../../main/steps/respond-to-claim/contact-preferences-text-message';
import { saveDraftDefendantResponse } from '../../../../main/steps/utils/buildDraftDefendantResponse';

describe('contact preferences submit-time CCD payloads', () => {
  // Reusable minimal req/res scaffolding for formBuilder steps
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
            data: {},
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

  describe('contact-preferences-telephone', () => {
    it('builds CCD payload when req.body has telephone data', async () => {
      const { req, res, next } = createBaseReqRes();

      req.body = {
        contactByTelephone: 'yes',
        'contactByTelephone.phoneNumber': '07123456789',
      };

      const post = telephoneStep.postController?.post;
      expect(post).toBeDefined();

      await post!(req as unknown as Request, res as unknown as Response, next);

      expect(saveDraftDefendantResponse).toHaveBeenCalledWith(
        req,
        expect.objectContaining({
          defendantContactDetails: expect.objectContaining({
            party: expect.objectContaining({
              phoneNumber: '07123456789',
            }),
          }),
          defendantResponses: expect.objectContaining({
            contactByPhone: 'YES',
          }),
        })
      );
    });
  });

  describe('contact-preferences-text-message', () => {
    it('builds CCD payload when req.body has text message data', async () => {
      const { req, res, next } = createBaseReqRes();

      req.body = {
        contactByTextMessage: 'yes',
      };

      const post = textStep.postController?.post;
      expect(post).toBeDefined();

      await post!(req as unknown as Request, res as unknown as Response, next);

      expect(saveDraftDefendantResponse).toHaveBeenCalledWith(
        req,
        expect.objectContaining({
          defendantResponses: expect.objectContaining({
            contactByText: 'YES',
          }),
        })
      );
    });
  });
});
