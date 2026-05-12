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
  return { ...actual, validateForm: jest.fn(() => ({})) };
});

const mockSaveDraftDefendantResponse = jest.fn();
const mockBuildDraftDefendantResponse = jest.fn();
jest.mock('../../../../main/steps/utils/buildDraftDefendantResponse', () => ({
  buildDraftDefendantResponse: mockBuildDraftDefendantResponse,
  saveDraftDefendantResponse: mockSaveDraftDefendantResponse,
}));

jest.mock('../../../../main/steps/utils/ccdAddress', () => ({
  buildCcdAddressFromFormParts: jest.fn((parts: Record<string, unknown>) => ({ ...parts })),
  formatCcdAddress: jest.fn(() => '1 Test Street, London, SW1A 1AA'),
}));

jest.mock('../../../../main/steps/utils/getClaimantName', () => ({
  getClaimantName: jest.fn(() => 'Claimant Name'),
}));

import { validateForm } from '../../../../main/modules/steps/formBuilder/helpers';
import { step } from '../../../../main/steps/respond-to-claim/correspondence-address';

describe('correspondence-address beforeRedirect', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createReq = (body: Record<string, unknown> = {}): any => ({
    body,
    originalUrl: '/case/1234567890123456/respond-to-claim/correspondence-address',
    query: { lang: 'en' },
    params: { caseReference: '1234567890123456' },
    session: { formData: {}, ccdCase: { id: '1234567890123456' } },
    app: { locals: { nunjucksEnv: { render: jest.fn() } } },
    i18n: { getResourceBundle: jest.fn(() => ({})) },
    res: {
      locals: {
        validatedCase: {
          id: '1234567890123456',
          data: { possessionClaimResponse: {} },
          possessionClaimResponse: {},
        },
      },
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (validateForm as jest.Mock).mockReturnValue({});
    mockSaveDraftDefendantResponse.mockResolvedValue(undefined);
  });

  it('sets correspondenceAddressConfirmation to YES and clears stale party.address when user selects yes', async () => {
    const response = {
      defendantResponses: {} as Record<string, unknown>,
      defendantContactDetails: {
        party: { address: { AddressLine1: 'Stale Road', PostCode: 'SW1A 1AA' } } as Record<string, unknown>,
      },
    };
    mockBuildDraftDefendantResponse.mockReturnValue(response);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;
    const req = createReq({ action: 'continue', correspondenceAddressConfirm: 'yes' });

    if (!step.postController) {
      throw new Error('expected postController');
    }
    await step.postController.post(req, res, jest.fn());

    expect(response.defendantResponses).toMatchObject({ correspondenceAddressConfirmation: 'YES' });
    expect(response.defendantContactDetails.party.address).toBeUndefined();
    expect(mockSaveDraftDefendantResponse).toHaveBeenCalledWith(req, response);
  });

  it('sets correspondenceAddressConfirmation to NO and saves entered address when user selects no', async () => {
    const response = {
      defendantResponses: {} as Record<string, unknown>,
      defendantContactDetails: { party: {} as Record<string, unknown> },
    };
    mockBuildDraftDefendantResponse.mockReturnValue(response);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;
    const req = createReq({
      action: 'continue',
      correspondenceAddressConfirm: 'no',
      'correspondenceAddressConfirm.addressLine1': '1 New Street',
      'correspondenceAddressConfirm.townOrCity': 'London',
      'correspondenceAddressConfirm.postcode': 'E1 1AA',
    });

    if (!step.postController) {
      throw new Error('expected postController');
    }
    await step.postController.post(req, res, jest.fn());

    expect(response.defendantResponses).toMatchObject({ correspondenceAddressConfirmation: 'NO' });
    expect(response.defendantContactDetails.party.address).toEqual({
      addressLine1: '1 New Street',
      addressLine2: undefined,
      townOrCity: 'London',
      county: undefined,
      postcode: 'E1 1AA',
    });
    expect(mockSaveDraftDefendantResponse).toHaveBeenCalledWith(req, response);
  });

  it('clears both correspondenceAddressConfirmation and party.address when answer is absent', async () => {
    const response = {
      defendantResponses: { correspondenceAddressConfirmation: 'YES' } as Record<string, unknown>,
      defendantContactDetails: {
        party: { address: { AddressLine1: 'Old Road' } } as Record<string, unknown>,
      },
    };
    mockBuildDraftDefendantResponse.mockReturnValue(response);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;
    await step.postController!.post(createReq({ action: 'continue' }), res, jest.fn());

    expect(response.defendantResponses.correspondenceAddressConfirmation).toBeUndefined();
    expect(response.defendantContactDetails.party.address).toBeUndefined();
    expect(mockSaveDraftDefendantResponse).toHaveBeenCalledWith(expect.anything(), response);
  });
});
