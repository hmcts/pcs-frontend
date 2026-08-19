import type { Request, Response } from 'express';

import { step } from '../../../../main/steps/respond-to-claim/confirmation-of-notice-given';
import { saveDraftDefendantResponse } from '../../../../main/steps/utils/buildDraftDefendantResponse';

jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(() => jest.fn((key: string) => key)),
}));

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

describe('confirmation-of-notice-given step', () => {
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
    const { req } = createBaseReqRes();

    req.body = {
      possessionNoticeReceived: 'NOT_SURE',
    };

    const beforeRedirect = (step as any).beforeRedirect;
    expect(beforeRedirect).toBeDefined();

    await beforeRedirect(req);

    expect(saveDraftDefendantResponse).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        defendantResponses: {
          possessionNoticeReceived: 'NOT_SURE',
        },
      })
    );
  });

  describe('extendGetContent', () => {
    it('returns noticeDocument and isRelease12Enabled when present in caseData', async () => {
      const { req } = createBaseReqRes();
      req.res = {
        locals: {
          release12Enabled: true,
          validatedCase: {
            id: '123',
            data: {
              detailsTab_NoticeDetails: {
                noticeDocuments: [
                  {
                    id: 'notice-doc-123',
                    value: { document_filename: 'notice.pdf' },
                  },
                ],
              },
            },
          },
        },
      } as unknown as Response;

      const content = (step as any).extendGetContent ? (step as any).extendGetContent(req) : {};
      expect(content).toEqual(
        expect.objectContaining({
          noticeDocument: expect.objectContaining({ id: 'notice-doc-123' }),
          isRelease12Enabled: true,
        })
      );
    });
  });
});
