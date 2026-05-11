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

import type { Request } from 'express';

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
});
