import type { Environment } from 'nunjucks';

jest.mock('../../../../main/modules/steps/i18n', () => ({
  loadStepNamespace: jest.fn(),
  getStepTranslations: jest.fn(() => ({})),
  getTranslationFunction: jest.fn(() => (key: string) => key),
}));

jest.mock('../../../../main/modules/i18n', () => ({
  getRequestLanguage: jest.fn(() => 'en'),
  getCommonTranslations: jest.fn(() => ({})),
}));

jest.mock('../../../../main/modules/steps/flow', () => ({
  stepNavigation: {
    getBackUrl: jest.fn(async () => null),
    getNextStepUrl: jest.fn(async () => '/next-step'),
  },
  createStepNavigation: jest.fn(() => ({
    getBackUrl: jest.fn(async () => '/previous-step'),
    getNextStepUrl: jest.fn(async () => '/next-step'),
  })),
}));

jest.mock('../../../../main/modules/steps/formBuilder/helpers', () => {
  const actual = jest.requireActual('../../../../main/modules/steps/formBuilder/helpers');
  return {
    ...actual,
    validateForm: jest.fn(),
  };
});

// Mock the draft helpers: buildDraftDefendantResponse returns the EXISTING draft
// (so we can prove the step replaces rather than merges), saveDraftDefendantResponse
// captures the payload the step would send to the holistic full-replace.
const mockSaveDraftDefendantResponse = jest.fn();
const existingCounterClaimAgainst = [
  { id: 'c1', value: { orgName: 'Landlord Ltd' } },
  { id: 'd2', value: { firstName: 'Jane', lastName: 'Doe' } },
];
jest.mock('../../../../main/steps/utils/buildDraftDefendantResponse', () => ({
  buildDraftDefendantResponse: jest.fn(() => ({
    defendantResponses: { counterClaim: { claimType: 'OTHER', counterClaimAgainst: existingCounterClaimAgainst } },
    defendantContactDetails: { party: {} },
  })),
  saveDraftDefendantResponse: mockSaveDraftDefendantResponse,
}));

import { validateForm } from '../../../../main/modules/steps/formBuilder/helpers';
import { step } from '../../../../main/steps/respond-to-claim/counter-claim-against-whom';

describe('respond-to-claim counter-claim-against-whom — holistic draft save', () => {
  const caseReference = '1234567890123456';
  const nunjucksEnv = { render: jest.fn() } as unknown as Environment;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createReq = (body: Record<string, unknown>): any => ({
    body: { action: 'continue', ...body },
    originalUrl: `/case/${caseReference}/respond-to-claim/counter-claim-against-whom`,
    query: { lang: 'en' },
    params: { caseReference },
    session: { formData: {}, ccdCase: { id: caseReference } },
    app: { locals: { nunjucksEnv } },
    i18n: { getResourceBundle: jest.fn(() => ({})) },
    res: {
      locals: {
        validatedCase: {
          id: caseReference,
          data: {
            allClaimants: [{ id: 'c1', value: { orgName: 'Landlord Ltd' } }],
            allDefendants: [
              { id: 'd-self', value: { firstName: 'Me', lastName: 'Defendant' } },
              { id: 'd2', value: { firstName: 'Jane', lastName: 'Doe' } },
            ],
            possessionClaimResponse: { currentDefendantPartyId: 'd-self' },
          },
        },
      },
    },
  });

  const post = async (body: Record<string, unknown>): Promise<void> => {
    const req = createReq(body);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;
    if (!step.postController) {
      throw new Error('expected postController');
    }
    await step.postController.post(req, res, jest.fn());
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const savedCounterClaim = (): any => {
    const payload = mockSaveDraftDefendantResponse.mock.calls[0][1] as Record<string, unknown>;
    return (payload.defendantResponses as Record<string, unknown>).counterClaim;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (validateForm as jest.Mock).mockReturnValue({});
    mockSaveDraftDefendantResponse.mockResolvedValue(undefined);
  });

  it('replaces the selection when a previously-ticked party is unticked (no stale parties)', async () => {
    // Existing draft has [Landlord Ltd, Jane Doe]; the citizen re-submits with only Landlord Ltd ticked.
    await post({ counterClaimAgainst: ['c1'] });

    const ids = savedCounterClaim().counterClaimAgainst.map((p: { id: string }) => p.id);
    expect(ids).toEqual(['c1']); // Jane Doe (d2) is dropped — full replace, not merge.
  });

  it('switches the selection cleanly to a different party', async () => {
    await post({ counterClaimAgainst: ['d2'] });

    const parties = savedCounterClaim().counterClaimAgainst;
    expect(parties).toHaveLength(1);
    expect(parties[0]).toEqual({ id: 'd2', value: { firstName: 'Jane', lastName: 'Doe' } });
  });

  it('deletes counterClaimAgainst entirely when nothing is selected', async () => {
    await post({});

    expect(savedCounterClaim()).not.toHaveProperty('counterClaimAgainst');
  });
});
