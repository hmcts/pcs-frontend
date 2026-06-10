jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
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

jest.mock('../../../../main/services/feeLookupService', () => ({
  FeeType: { counterClaimFlatFeeFEE0450: 'counterClaimFlatFeeFEE0450' },
  getFee: jest.fn(),
}));

import type { Request } from 'express';

import { deleteDocument } from '../../../../main/services/cdamService';
import { step } from '../../../../main/steps/respond-to-claim/counter-claim';
import { saveDraftDefendantResponse } from '../../../../main/steps/utils/buildDraftDefendantResponse';

describe('counter-claim step', () => {
  const testedStep = step as unknown as {
    stepName: string;
    fields: { name: string; type: string }[];
    documentStorage?: unknown;
    beforeRedirect: (req: Request) => Promise<void>;
  };

  it('has correct step name', () => {
    expect(testedStep.stepName).toBe('counter-claim');
  });

  it('exposes the makeCounterClaim radio field', () => {
    expect(testedStep.fields).toHaveLength(1);
    expect(testedStep.fields[0]).toMatchObject({ name: 'makeCounterClaim', type: 'radio' });
  });

  it('has no documentStorage (upload removed)', () => {
    expect(testedStep.documentStorage).toBeUndefined();
  });

  describe('CDAM purge on makeCounterClaim NO', () => {
    const docs = [{ id: 'd', value: { document: { document_url: 'http://cdam/documents/x' } } }];

    const buildReq = (makeCounterClaim: 'YES' | 'NO' | undefined): Request =>
      ({
        body: makeCounterClaim ? { makeCounterClaim } : {},
        session: { formData: {}, user: { accessToken: 'tkn' } },
        res: {
          locals: {
            validatedCase: {
              id: '123',
              data: {
                possessionClaimResponse: {
                  defendantResponses: { counterClaimDocuments: docs },
                },
              },
            },
          },
        },
      }) as unknown as Request;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('purges CDAM docs when NO is submitted', async () => {
      await testedStep.beforeRedirect(buildReq('NO'));

      expect(deleteDocument).toHaveBeenCalledWith('http://cdam/documents/x', 'tkn');
      expect(saveDraftDefendantResponse).toHaveBeenCalled();
    });

    it('does not purge CDAM docs when YES is submitted', async () => {
      await testedStep.beforeRedirect(buildReq('YES'));

      expect(deleteDocument).not.toHaveBeenCalled();
    });
  });
});
