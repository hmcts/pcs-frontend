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
import {
  buildAddressFieldValues,
  isFullUkPostcode,
  step,
} from '../../../../main/steps/respond-to-claim/correspondence-address';

describe('correspondence-address isAnswered', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reqWith = (validatedCase: Record<string, unknown>): any => ({ res: { locals: { validatedCase } } });

  it('is answered once the citizen confirms (correspondenceAddressConfirmation set)', () => {
    expect(step.isAnswered?.(reqWith({ defendantResponses: { correspondenceAddressConfirmation: 'YES' } }))).toBe(true);
  });

  it('is NOT answered when only the claim-prefilled party address is present (no confirmation)', () => {
    expect(
      step.isAnswered?.(reqWith({ defendantContactDetailsPartyAddress: { AddressLine1: '2 Second Avenue' } }))
    ).toBe(false);
  });

  it('is NOT answered when nothing is set', () => {
    expect(step.isAnswered?.(reqWith({}))).toBe(false);
  });
});

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
          claimantEnteredDefendantDetailsAddressKnown: 'YES',
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
});

// HDPI-8866 W10 — a deliberately cleared optional field must stay cleared on an error re-render,
// and the corrected resubmission must not carry the old value.
describe('correspondence-address buildAddressFieldValues', () => {
  const savedAddress = {
    AddressLine1: '1 Second Avenue',
    AddressLine2: 'Flat 4',
    PostTown: 'London',
    County: 'Greater London',
    PostCode: 'W3 7RX',
  };

  it('keeps posted empty strings empty on a POST error re-render (does not restore saved line 2 / county)', () => {
    const formContent = {
      'correspondenceAddressConfirm.addressLine1': '1 Second Avenue',
      'correspondenceAddressConfirm.addressLine2': '',
      'correspondenceAddressConfirm.townOrCity': 'London',
      'correspondenceAddressConfirm.county': '',
      'correspondenceAddressConfirm.postcode': 'INVALID',
    };

    const values = buildAddressFieldValues({ method: 'POST' }, formContent, savedAddress);

    expect(values).toEqual({
      correspondenceAddressLine1: '1 Second Avenue',
      correspondenceAddressLine2: '',
      correspondenceTownOrCity: 'London',
      correspondenceCounty: '',
      correspondencePostcode: 'INVALID',
    });
  });

  it('uses the saved value only for a field that was not posted at all', () => {
    const values = buildAddressFieldValues({ method: 'GET' }, {}, savedAddress);

    expect(values.correspondenceAddressLine2).toBe('Flat 4');
    expect(values.correspondenceCounty).toBe('Greater London');
  });

  it('prepopulates the initial GET from the form data when present, falling back to the saved address', () => {
    const values = buildAddressFieldValues(
      { method: 'GET' },
      { 'correspondenceAddressConfirm.addressLine2': 'Flat 9' },
      savedAddress
    );

    expect(values.correspondenceAddressLine2).toBe('Flat 9');
    expect(values.correspondenceCounty).toBe('Greater London');
    expect(values.correspondencePostcode).toBe('W3 7RX');
  });

  it('does not fall back to the saved address on a POST when a field is absent', () => {
    const values = buildAddressFieldValues({ method: 'POST' }, {}, savedAddress);

    expect(values.correspondenceAddressLine2).toBe('');
    expect(values.correspondenceCounty).toBe('');
  });
});

describe('correspondence-address isFullUkPostcode', () => {
  it.each(['W3 7RX', 'w3 7rx', 'SW1A 1AA', 'EC1A1BB', 'M1 1AE'])('accepts full postcode %s', postcode => {
    expect(isFullUkPostcode(postcode)).toBe(true);
  });

  it.each(['W5', 'INVALID', 'W3', '12345', 'W3 7R'])('rejects %s', postcode => {
    expect(isFullUkPostcode(postcode)).toBe(false);
  });
});

describe('correspondence-address corrected resubmission after clearing optional fields', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createReq = (body: Record<string, unknown> = {}): any => ({
    body,
    method: 'POST',
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
          possessionClaimResponse: {
            defendantContactDetails: {
              party: {
                address: {
                  AddressLine1: '1 Second Avenue',
                  AddressLine2: 'Flat 4',
                  PostTown: 'London',
                  County: 'Greater London',
                  PostCode: 'W3 7RX',
                },
              },
            },
          },
          claimantEnteredDefendantDetailsAddressKnown: 'YES',
        },
      },
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (validateForm as jest.Mock).mockReturnValue({});
    mockSaveDraftDefendantResponse.mockResolvedValue(undefined);
  });

  it('saves the corrected postcode without the cleared line 2 and county', async () => {
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
      'correspondenceAddressConfirm.addressLine1': '1 Second Avenue',
      'correspondenceAddressConfirm.addressLine2': '',
      'correspondenceAddressConfirm.townOrCity': 'London',
      'correspondenceAddressConfirm.county': '',
      'correspondenceAddressConfirm.postcode': 'W3 7RX',
    });

    if (!step.postController) {
      throw new Error('expected postController');
    }
    await step.postController.post(req, res, jest.fn());

    // ccdAddress is mocked to pass the parts through; the real builder drops empty optional parts.
    expect(response.defendantContactDetails.party.address).toEqual({
      addressLine1: '1 Second Avenue',
      addressLine2: '',
      townOrCity: 'London',
      county: '',
      postcode: 'W3 7RX',
    });
    expect(mockSaveDraftDefendantResponse).toHaveBeenCalledWith(req, response);
  });
});
