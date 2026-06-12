jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
}));

jest.mock('../../../../main/steps/utils/buildDraftDefendantResponse', () => ({
  buildDraftDefendantResponse: jest.fn(() => ({
    defendantResponses: {},
    defendantContactDetails: { party: {} },
  })),
  saveDraftDefendantResponse: jest.fn(),
}));

jest.mock('../../../../main/services/cdamService', () => ({
  deleteDocument: jest.fn(),
}));

import type { Request } from 'express';

import { deleteDocument } from '../../../../main/services/cdamService';
import { step } from '../../../../main/steps/respond-to-claim/counter-claim-do-you-want-to-upload-files';
import { saveDraftDefendantResponse } from '../../../../main/steps/utils/buildDraftDefendantResponse';

type CounterClaimUploadFilesStep = {
  beforeRedirect: (req: Request) => Promise<void>;
};

describe('counter-claim-do-you-want-to-upload-files submit-time CCD payloads', () => {
  const testedStep = step as unknown as CounterClaimUploadFilesStep;

  const createBaseReq = (): Request =>
    ({
      body: {},
      session: { formData: {} },
      res: {
        locals: {
          validatedCase: { id: '123', data: {} },
        },
      },
    }) as unknown as Request;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists YES when user wants to upload files', async () => {
    const req = createBaseReq();
    req.body = { counterClaimWantToUploadFiles: 'YES' };

    await testedStep.beforeRedirect(req);

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
    const req = createBaseReq();
    req.body = { counterClaimWantToUploadFiles: 'NO' };

    await testedStep.beforeRedirect(req);

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
    const req = createBaseReq();
    req.body = {};

    await testedStep.beforeRedirect(req);

    expect(saveDraftDefendantResponse).toHaveBeenCalled();
  });

  it('deletes counterClaimWantToUploadFiles from draft when body has no value', async () => {
    const req = createBaseReq();
    req.body = {};

    await testedStep.beforeRedirect(req);

    const [, savedResponse] = (saveDraftDefendantResponse as jest.Mock).mock.calls[0];
    expect(savedResponse.defendantResponses).not.toHaveProperty('counterClaimWantToUploadFiles');
  });

  describe('CDAM purge on NO', () => {
    const buildReqWithDocs = (
      counterClaimWantToUploadFiles: 'YES' | 'NO' | undefined,
      counterClaimDocuments: { id: string; value: { document: { document_url: string } } }[]
    ): Request =>
      ({
        body: counterClaimWantToUploadFiles ? { counterClaimWantToUploadFiles } : {},
        session: { formData: {}, user: { accessToken: 'tkn' } },
        res: {
          locals: {
            validatedCase: {
              id: '123',
              data: {
                possessionClaimResponse: {
                  defendantResponses: { counterClaimDocuments },
                },
              },
            },
          },
        },
      }) as unknown as Request;

    const docs = [
      { id: 'doc-1', value: { document: { document_url: 'http://cdam/documents/abc' } } },
      { id: 'doc-2', value: { document: { document_url: 'http://cdam/documents/def' } } },
    ];

    it('calls cdamService.deleteDocument for every existing doc when NO is submitted', async () => {
      const req = buildReqWithDocs('NO', docs);

      await testedStep.beforeRedirect(req);

      expect(deleteDocument).toHaveBeenCalledTimes(2);
      expect(deleteDocument).toHaveBeenCalledWith('http://cdam/documents/abc', 'tkn');
      expect(deleteDocument).toHaveBeenCalledWith('http://cdam/documents/def', 'tkn');
    });

    it('does not call cdamService.deleteDocument when YES is submitted', async () => {
      const req = buildReqWithDocs('YES', docs);

      await testedStep.beforeRedirect(req);

      expect(deleteDocument).not.toHaveBeenCalled();
    });

    it('does not call cdamService.deleteDocument when no existing docs', async () => {
      const req = buildReqWithDocs('NO', []);

      await testedStep.beforeRedirect(req);

      expect(deleteDocument).not.toHaveBeenCalled();
    });

    it('still saves the draft when CDAM rejects', async () => {
      (deleteDocument as jest.Mock).mockRejectedValueOnce(new Error('cdam down'));
      const req = buildReqWithDocs('NO', [docs[0]]);

      await testedStep.beforeRedirect(req);

      expect(saveDraftDefendantResponse).toHaveBeenCalled();
    });
  });
});
