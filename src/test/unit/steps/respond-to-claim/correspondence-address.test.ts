// Mocks reflect the framework boundary: i18n + flow + validateForm + draft-save are
// what `postController.post` integrates with. ccdAddress and getClaimantName are NOT
// exercised by isAnswered or the beforeRedirect path tested here — using the real
// `buildCcdAddressFromFormParts` gives the NO-branch test a meaningful assertion on
// the actual CCD save shape instead of a passthrough.
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

import type { CcdCaseModel } from '../../../../main/services/ccdCaseData.model';
import { step } from '../../../../main/steps/respond-to-claim/correspondence-address';

import { withValidatedCase } from './__helpers';

describe('correspondence-address isAnswered', () => {
  const reqWith = (validatedCase: Partial<CcdCaseModel>) => withValidatedCase(validatedCase as CcdCaseModel);

  it('is answered once the citizen confirms (correspondenceAddressConfirmation set)', () => {
    expect(
      step.isAnswered?.(
        reqWith({ defendantResponses: { correspondenceAddressConfirmation: 'YES' } } as Partial<CcdCaseModel>)
      )
    ).toBe(true);
  });

  it('is NOT answered when only the claim-prefilled party address is present (no confirmation)', () => {
    expect(
      step.isAnswered?.(
        reqWith({ defendantContactDetailsPartyAddress: { AddressLine1: '2 Second Avenue' } } as Partial<CcdCaseModel>)
      )
    ).toBe(false);
  });

  it('is NOT answered when nothing is set', () => {
    expect(step.isAnswered?.(reqWith({} as Partial<CcdCaseModel>))).toBe(false);
  });
});

describe('correspondence-address beforeRedirect (holistic draft-save contract)', () => {
  // Asserts the mutated `response` is exactly what gets sent to the backend's full-replace
  // draft save. See docs/HDPI-5164/HOLISTIC-DRAFT-SAVE.md for the contract.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createReq = (body: Record<string, unknown> = {}): any => ({
    body,
    originalUrl: '/case/1234567890123456/respond-to-claim/correspondence-address',
    query: { lang: 'en' },
    params: { caseReference: '1234567890123456' },
    session: { formData: {}, ccdCase: { id: '1234567890123456' } },
    app: { locals: { nunjucksEnv: { render: jest.fn() } } },
    i18n: { getResourceBundle: jest.fn(() => ({})) },
    res: { locals: { validatedCase: { id: '1234567890123456' } } },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveDraftDefendantResponse.mockResolvedValue(undefined);
  });

  it('YES branch: sets confirmation to YES and clears stale party.address', async () => {
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

    await step.postController!.post(req, res, jest.fn());

    expect(response.defendantResponses).toEqual({ correspondenceAddressConfirmation: 'YES' });
    expect(response.defendantContactDetails.party.address).toBeUndefined();
    expect(mockSaveDraftDefendantResponse).toHaveBeenCalledWith(req, response);
  });

  it('NO branch: sets confirmation to NO and persists the entered address in CCD shape', async () => {
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

    await step.postController!.post(req, res, jest.fn());

    expect(response.defendantResponses).toEqual({ correspondenceAddressConfirmation: 'NO' });
    expect(response.defendantContactDetails.party.address).toEqual({
      AddressLine1: '1 New Street',
      PostTown: 'London',
      PostCode: 'E1 1AA',
    });
    expect(mockSaveDraftDefendantResponse).toHaveBeenCalledWith(req, response);
  });

  it('absent answer: clears both confirmation and party.address', async () => {
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
