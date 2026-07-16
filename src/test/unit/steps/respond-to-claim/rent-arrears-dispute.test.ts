import type { Request, Response } from 'express';
import type { Environment } from 'nunjucks';

jest.mock('../../../../main/modules/steps/i18n', () => ({
  loadStepNamespace: jest.fn(),
  getStepTranslations: jest.fn(() => ({})),
  getTranslationFunction: jest.fn(() => t),
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

jest.mock('../../../../main/steps/utils/buildDraftDefendantResponse', () => ({
  buildDraftDefendantResponse: jest.fn(() => ({
    defendantResponses: {},
    defendantContactDetails: { party: {} },
  })),
  saveDraftDefendantResponse: jest.fn(),
}));

const t = ((key: string, options?: Record<string, string>) => {
  const translations: Record<string, string> = {
    pageTitle: 'Do you agree with the amount of rent arrears?',
    amountOwedHeading: `Amount owed to ${options?.claimantName ?? 'claimant'}`,
    rentArrearsAmountCorrection: 'Tell us the correct amount',
    rentStatementDocumentLinkText: 'View rent statement',
    'buttons.saveAndContinue': 'Save and continue',
    'buttons.continue': 'Continue',
    'buttons.saveForLater': 'Save for later',
    'buttons.cancel': 'Cancel',
    'errors.title': 'There is a problem',
    serviceName: 'Test service',
    phase: 'ALPHA',
    feedback: 'Feedback',
    back: 'Back',
    languageToggle: 'Language toggle',
    contactUsForHelp: 'Contact us for help',
    contactUsForHelpText: 'You can contact us for help.',
  };
  return translations[key] || key;
}) as unknown as (key: string, options?: Record<string, string>) => string;

import type { SupportedLang } from '../../../../main/modules/steps';
import { GetController } from '../../../../main/modules/steps';
import { validateForm } from '../../../../main/modules/steps/formBuilder/helpers';
import { step } from '../../../../main/steps/respond-to-claim/rent-arrears-dispute';
import { saveDraftDefendantResponse } from '../../../../main/steps/utils/buildDraftDefendantResponse';

describe('respond-to-claim rent-arrears-dispute step', () => {
  const nunjucksEnv = { render: jest.fn() } as unknown as Environment;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createReq = (overrides: Record<string, unknown> = {}): any => ({
    body: {},
    originalUrl: '/case/1234567890123456/respond-to-claim/rent-arrears-dispute',
    query: { lang: 'en' },
    params: { caseReference: '1234567890123456' },
    session: {
      formData: {},
      user: { accessToken: 'token' },
    },
    app: { locals: { nunjucksEnv } },
    i18n: { getResourceBundle: jest.fn(() => ({})) },
    res: {
      locals: {
        validatedCase: {
          id: '1234567890123456',
          data: {
            rentArrears_Total: '12345',
            detailsTab_RentArrearsDetails: {
              rentStatement: ['rent-statement.pdf'],
            },
            possessionClaimResponse: {
              claimantOrganisations: [{ value: 'Treetops Housing' }],
            },
          },
        },
      },
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes correct step url and custom template view', () => {
    expect(step.name).toBe('rent-arrears-dispute');
    expect(step.url).toBe('/case/:caseReference/respond-to-claim/rent-arrears-dispute');
    expect(step.view).toContain('rentArrearsDispute.njk');
  });

  it('POST saves YES without corrected amount', async () => {
    (validateForm as jest.Mock).mockReturnValue({});

    const req = createReq({
      body: {
        action: 'continue',
        rentArrears: 'yes',
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;
    const next = jest.fn();

    if (!step.postController) {
      throw new Error('expected postController');
    }
    await step.postController.post(req, res, next);

    expect(saveDraftDefendantResponse).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        defendantResponses: expect.objectContaining({
          rentArrearsAmountConfirmation: 'YES',
        }),
      })
    );

    const savedDraft = (saveDraftDefendantResponse as jest.Mock).mock.calls[0][1];
    expect(savedDraft.defendantResponses).not.toHaveProperty('rentArrearsAmount');
  });

  it('POST saves NO with corrected amount in pence', async () => {
    (validateForm as jest.Mock).mockReturnValue({});

    const req = createReq({
      body: {
        action: 'continue',
        rentArrears: 'no',
        'rentArrears.rentArrearsAmountCorrection': '125.50',
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;
    const next = jest.fn();

    if (!step.postController) {
      throw new Error('expected postController');
    }
    await step.postController.post(req, res, next);

    expect(saveDraftDefendantResponse).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        defendantResponses: expect.objectContaining({
          rentArrearsAmountConfirmation: 'NO',
          rentArrearsAmount: '12550',
        }),
      })
    );
  });

  it('POST saves NOT_SURE without corrected amount', async () => {
    (validateForm as jest.Mock).mockReturnValue({});

    const req = createReq({
      body: {
        action: 'continue',
        rentArrears: 'notSure',
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;
    const next = jest.fn();

    if (!step.postController) {
      throw new Error('expected postController');
    }
    await step.postController.post(req, res, next);

    expect(saveDraftDefendantResponse).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        defendantResponses: expect.objectContaining({
          rentArrearsAmountConfirmation: 'NOT_SURE',
        }),
      })
    );

    const savedDraft = (saveDraftDefendantResponse as jest.Mock).mock.calls[0][1];
    expect(savedDraft.defendantResponses).not.toHaveProperty('rentArrearsAmount');
  });

  it('isAnswered returns true when the confirmation has been saved', () => {
    const result = step.isAnswered?.(
      createReq({
        res: {
          locals: {
            validatedCase: {
              defendantResponses: {
                rentArrearsAmountConfirmation: 'YES',
              },
            },
          },
        },
      })
    );

    expect(result).toBe(true);
  });

  it('returns the first rent statement document from detailsTab_RentArrearsDetails', async () => {
    const rentStatementDocument = {
      id: '66666666-6666-4666-8666-666666666666',
      value: {
        document_filename: 'rent-statement.pdf',
        document_binary_url: 'http://dm-store/documents/rent-123/binary',
        category_id: 'propertyDocuments',
      },
    };

    const req = createReq({
      res: {
        locals: {
          validatedCase: {
            id: '1234567890123456',
            data: {
              rentArrears_Total: '12345',
              detailsTab_RentArrearsDetails: {
                rentStatement: [rentStatementDocument, { id: 'ignored' }],
              },
              possessionClaimResponse: {
                claimantOrganisations: [{ value: 'Treetops Housing' }],
              },
            },
          },
        },
      },
    }) as Request;

    const locals = req.res?.locals ?? {};
    const res = {
      render: jest.fn(),
      locals,
    } as unknown as Response;
    req.res = res;

    const gc = step.getController;
    const controller: GetController = typeof gc === 'function' ? (gc as (lang?: SupportedLang) => GetController)() : gc;
    await controller.get(req, res);

    const renderData = (res.render as jest.Mock).mock.calls[0][1] as Record<string, unknown>;
    expect(renderData.rentStatementDocument).toEqual(rentStatementDocument);
  });

  it('returns an empty string when detailsTab_RentArrearsDetails exists but rentStatement is empty', async () => {
    const req = createReq({
      res: {
        locals: {
          validatedCase: {
            id: '1234567890123456',
            data: {
              rentArrears_Total: '12345',
              detailsTab_RentArrearsDetails: {
                rentStatement: [],
              },
              possessionClaimResponse: {
                claimantOrganisations: [{ value: 'Treetops Housing' }],
              },
            },
          },
        },
      },
    }) as Request;

    const locals = req.res?.locals ?? {};
    const res = {
      render: jest.fn(),
      locals,
    } as unknown as Response;
    req.res = res;

    const gc = step.getController;
    const controller: GetController = typeof gc === 'function' ? (gc as (lang?: SupportedLang) => GetController)() : gc;
    await controller.get(req, res);

    const renderData = (res.render as jest.Mock).mock.calls[0][1] as Record<string, unknown>;
    expect(renderData.rentStatementDocument).toEqual('');
  });
});
