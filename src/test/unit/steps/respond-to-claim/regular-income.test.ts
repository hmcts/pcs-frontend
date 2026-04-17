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

const mockBuildCcdCaseForPossessionClaimResponse = jest.fn();
jest.mock('../../../../main/steps/utils/populateResponseToClaimPayloadmap', () => ({
  buildCcdCaseForPossessionClaimResponse: mockBuildCcdCaseForPossessionClaimResponse,
}));

import { validateForm } from '../../../../main/modules/steps/formBuilder/helpers';
import { step } from '../../../../main/steps/respond-to-claim/regular-income';

type SessionShape = {
  formData: Record<string, unknown>;
  ccdCase: { id: string };
  respondToClaimCaseOverrides?: Record<string, { regularIncomeUcUnticked?: boolean }>;
};

describe('respond-to-claim regular-income step', () => {
  const caseReference = '1234567890123456';
  const nunjucksEnv = { render: jest.fn() } as unknown as Environment;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createReq = (overrides: Record<string, unknown> = {}): any => ({
    body: {},
    originalUrl: `/case/${caseReference}/respond-to-claim/what-regular-income-do-you-receive`,
    query: { lang: 'en' },
    params: { caseReference },
    session: {
      formData: {},
      ccdCase: { id: caseReference },
    } as SessionShape,
    app: { locals: { nunjucksEnv } },
    i18n: { getResourceBundle: jest.fn(() => ({})) },
    res: { locals: { validatedCase: { id: caseReference, data: {} } } },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildCcdCaseForPossessionClaimResponse.mockResolvedValue({ id: caseReference, data: {} });
  });

  it('POST maps universal credit selection to CCD Yes (no date touched)', async () => {
    (validateForm as jest.Mock).mockReturnValue({});
    const req = createReq({
      body: {
        action: 'continue',
        regularIncome: 'universalCredit',
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;
    const next = jest.fn();

    if (!step.postController) {
      throw new Error('expected postController');
    }

    await step.postController.post(req, res, next);

    expect(mockBuildCcdCaseForPossessionClaimResponse).toHaveBeenCalledWith(expect.anything(), {
      defendantResponses: {
        householdCircumstances: {
          universalCredit: 'YES',
        },
      },
    });
  });

  it('POST does not re-write universal credit when already YES in CCD', async () => {
    (validateForm as jest.Mock).mockReturnValue({});
    const req = createReq({
      body: {
        action: 'continue',
        regularIncome: 'universalCredit',
      },
      res: {
        locals: {
          validatedCase: {
            id: caseReference,
            data: {
              possessionClaimResponse: {
                defendantResponses: {
                  householdCircumstances: {
                    universalCredit: 'YES',
                  },
                },
              },
            },
          },
        },
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;
    const next = jest.fn();

    if (!step.postController) {
      throw new Error('expected postController');
    }

    await step.postController.post(req, res, next);

    expect(mockBuildCcdCaseForPossessionClaimResponse).not.toHaveBeenCalled();
  });

  it('POST clears the session-level unticked override when the user re-ticks UC', async () => {
    (validateForm as jest.Mock).mockReturnValue({});
    const req = createReq({
      body: {
        action: 'continue',
        regularIncome: 'universalCredit',
      },
      session: {
        formData: {},
        ccdCase: { id: caseReference },
        respondToClaimCaseOverrides: { [caseReference]: { regularIncomeUcUnticked: true } },
      } as SessionShape,
      res: {
        locals: {
          validatedCase: {
            id: caseReference,
            data: {
              possessionClaimResponse: {
                defendantResponses: {
                  householdCircumstances: {
                    universalCredit: 'YES',
                  },
                },
              },
            },
          },
        },
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;
    const next = jest.fn();

    if (!step.postController) {
      throw new Error('expected postController');
    }

    await step.postController.post(req, res, next);

    const overrides = (req.session as SessionShape).respondToClaimCaseOverrides?.[caseReference];
    expect(overrides?.regularIncomeUcUnticked).toBeUndefined();
    expect(mockBuildCcdCaseForPossessionClaimResponse).not.toHaveBeenCalled();
  });

  it('POST does not write anything when selection is absent and no existing UC data', async () => {
    (validateForm as jest.Mock).mockReturnValue({});
    const req = createReq({
      body: {
        action: 'continue',
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;
    const next = jest.fn();

    if (!step.postController) {
      throw new Error('expected postController');
    }

    await step.postController.post(req, res, next);

    expect(mockBuildCcdCaseForPossessionClaimResponse).not.toHaveBeenCalled();
    const overrides = (req.session as SessionShape).respondToClaimCaseOverrides?.[caseReference];
    expect(overrides?.regularIncomeUcUnticked).toBeUndefined();
  });

  it('POST sets session-level unticked override when the user unchecks the UC checkbox over an existing YES', async () => {
    (validateForm as jest.Mock).mockReturnValue({});
    const req = createReq({
      body: {
        action: 'continue',
      },
      res: {
        locals: {
          validatedCase: {
            id: caseReference,
            data: {
              possessionClaimResponse: {
                defendantResponses: {
                  householdCircumstances: {
                    universalCredit: 'YES',
                  },
                },
              },
            },
          },
        },
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;
    const next = jest.fn();

    if (!step.postController) {
      throw new Error('expected postController');
    }

    await step.postController.post(req, res, next);

    expect(mockBuildCcdCaseForPossessionClaimResponse).not.toHaveBeenCalled();
    const overrides = (req.session as SessionShape).respondToClaimCaseOverrides?.[caseReference];
    expect(overrides?.regularIncomeUcUnticked).toBe(true);
  });

  it('POST also sets the unticked override when the draft already has a UC date', async () => {
    (validateForm as jest.Mock).mockReturnValue({});
    const req = createReq({
      body: {
        action: 'continue',
      },
      res: {
        locals: {
          validatedCase: {
            id: caseReference,
            data: {
              possessionClaimResponse: {
                defendantResponses: {
                  householdCircumstances: {
                    universalCredit: 'YES',
                    ucApplicationDate: '2024-02-10',
                  },
                },
              },
            },
          },
        },
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;
    const next = jest.fn();

    if (!step.postController) {
      throw new Error('expected postController');
    }

    await step.postController.post(req, res, next);

    expect(mockBuildCcdCaseForPossessionClaimResponse).not.toHaveBeenCalled();
    const overrides = (req.session as SessionShape).respondToClaimCaseOverrides?.[caseReference];
    expect(overrides?.regularIncomeUcUnticked).toBe(true);
  });

  it('POST does not touch an explicit NO when user leaves UC unchecked', async () => {
    (validateForm as jest.Mock).mockReturnValue({});
    const req = createReq({
      body: {
        action: 'continue',
      },
      res: {
        locals: {
          validatedCase: {
            id: caseReference,
            data: {
              possessionClaimResponse: {
                defendantResponses: {
                  householdCircumstances: {
                    universalCredit: 'NO',
                  },
                },
              },
            },
          },
        },
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;
    const next = jest.fn();

    if (!step.postController) {
      throw new Error('expected postController');
    }

    await step.postController.post(req, res, next);

    expect(mockBuildCcdCaseForPossessionClaimResponse).not.toHaveBeenCalled();
    const overrides = (req.session as SessionShape).respondToClaimCaseOverrides?.[caseReference];
    expect(overrides?.regularIncomeUcUnticked).toBeUndefined();
  });
});
