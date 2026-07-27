jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
}));

const mockBuildDraftDefendantResponse = jest.fn();

jest.mock('../../../../main/steps/utils/buildDraftDefendantResponse', () => ({
  buildDraftDefendantResponse: (...args: unknown[]) => mockBuildDraftDefendantResponse(...args),
  saveDraftDefendantResponse: jest.fn(),
}));

import type { Request } from 'express';

import { step } from '../../../../main/steps/respond-to-claim/counter-claim-what-are-you-claiming-for';
import { saveDraftDefendantResponse } from '../../../../main/steps/utils/buildDraftDefendantResponse';

type TestedStep = {
  beforeRedirect: (req: Request) => Promise<void>;
};

describe('counter-claim-what-are-you-claiming-for beforeRedirect', () => {
  const testedStep = step as unknown as TestedStep;

  const createDraft = (counterClaim: Record<string, unknown> = {}) => ({
    defendantResponses: { counterClaim },
    defendantContactDetails: { party: {} },
  });

  const createReq = (
    claimType: string | undefined,
    previousClaimType?: string,
    counterClaim: Record<string, unknown> = {
      claimType: previousClaimType,
      isClaimAmountKnown: 'YES',
      claimAmount: '8000',
    }
  ): Request =>
    ({
      body: claimType ? { claimType } : {},
      res: {
        locals: {
          validatedCase: {
            id: '123',
            data: {
              possessionClaimResponse: {
                defendantResponses: { counterClaim },
              },
            },
          },
        },
      },
    }) as unknown as Request;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildDraftDefendantResponse.mockImplementation(() =>
      createDraft({
        claimType: 'PAYMENT_OR_COMPENSATION',
        isClaimAmountKnown: 'YES',
        claimAmount: '8000',
      })
    );
  });

  it('clears money fields when claim type changes from sum of money to both', async () => {
    const req = createReq('BOTH', 'PAYMENT_OR_COMPENSATION');

    await testedStep.beforeRedirect(req);

    expect(saveDraftDefendantResponse).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        defendantResponses: expect.objectContaining({
          counterClaim: {
            claimType: 'BOTH',
          },
        }),
      })
    );
  });

  it('keeps money fields when claim type is unchanged', async () => {
    const req = createReq('PAYMENT_OR_COMPENSATION', 'PAYMENT_OR_COMPENSATION');

    await testedStep.beforeRedirect(req);

    expect(saveDraftDefendantResponse).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        defendantResponses: expect.objectContaining({
          counterClaim: expect.objectContaining({
            claimType: 'PAYMENT_OR_COMPENSATION',
            isClaimAmountKnown: 'YES',
            claimAmount: '8000',
          }),
        }),
      })
    );
  });

  it('clears money fields when claim type changes to something else', async () => {
    const req = createReq('SOMETHING_ELSE', 'PAYMENT_OR_COMPENSATION');

    await testedStep.beforeRedirect(req);

    expect(saveDraftDefendantResponse).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        defendantResponses: expect.objectContaining({
          counterClaim: {
            claimType: 'SOMETHING_ELSE',
          },
        }),
      })
    );
  });

  it('clears claim type and money fields when body has no claim type', async () => {
    const req = createReq(undefined, 'PAYMENT_OR_COMPENSATION');

    await testedStep.beforeRedirect(req);

    expect(saveDraftDefendantResponse).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        defendantResponses: expect.objectContaining({
          counterClaim: {},
        }),
      })
    );
  });
});
