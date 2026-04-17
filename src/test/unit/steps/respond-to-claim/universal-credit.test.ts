import type { Request, Response } from 'express';
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

import type { SupportedLang } from '../../../../main/modules/steps';
import { GetController } from '../../../../main/modules/steps';
import { validateForm } from '../../../../main/modules/steps/formBuilder/helpers';
import { step } from '../../../../main/steps/respond-to-claim/universal-credit';

describe('respond-to-claim universal-credit step', () => {
  const nunjucksEnv = { render: jest.fn() } as unknown as Environment;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createReq = (overrides: Record<string, unknown> = {}): any => ({
    body: {},
    originalUrl: '/case/1234567890123456/respond-to-claim/have-you-applied-for-universal-credit',
    query: { lang: 'en' },
    params: { caseReference: '1234567890123456' },
    session: {
      formData: {},
      ccdCase: { id: '1234567890123456' },
    },
    app: { locals: { nunjucksEnv } },
    i18n: { getResourceBundle: jest.fn(() => ({})) },
    res: { locals: { validatedCase: { id: '1234567890123456', data: {} } } },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildCcdCaseForPossessionClaimResponse.mockResolvedValue({ id: '1234567890123456', data: {} });
  });

  it('maps yes selection with application date', async () => {
    (validateForm as jest.Mock).mockReturnValue({});
    const req = createReq({
      body: {
        action: 'continue',
        haveAppliedForUniversalCredit: 'yes',
        'haveAppliedForUniversalCredit.ucApplicationDate-day': '10',
        'haveAppliedForUniversalCredit.ucApplicationDate-month': '02',
        'haveAppliedForUniversalCredit.ucApplicationDate-year': '2024',
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
          ucApplicationDate: '2024-02-10',
        },
      },
    });
  });

  it('maps no selection without date', async () => {
    (validateForm as jest.Mock).mockReturnValue({});
    const req = createReq({
      body: {
        action: 'continue',
        haveAppliedForUniversalCredit: 'no',
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
          universalCredit: 'NO',
          ucApplicationDate: null,
        },
      },
    });
  });

  it('ignores date fields when selection is no', async () => {
    (validateForm as jest.Mock).mockReturnValue({});
    const req = createReq({
      body: {
        action: 'continue',
        haveAppliedForUniversalCredit: 'no',
        'haveAppliedForUniversalCredit.ucApplicationDate-day': '31',
        'haveAppliedForUniversalCredit.ucApplicationDate-month': '02',
        'haveAppliedForUniversalCredit.ucApplicationDate-year': '2024',
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
          universalCredit: 'NO',
          ucApplicationDate: null,
        },
      },
    });
  });

  describe('pre-population via getController', () => {
    const hcAt = (hc: Record<string, unknown>) => ({
      possessionClaimResponse: { defendantResponses: { householdCircumstances: hc } },
    });

    type UcStepRenderData = Record<string, unknown> & { fieldValues: Record<string, unknown> };

    const render = async (hc: Record<string, unknown> | undefined): Promise<UcStepRenderData> => {
      const req = createReq({
        res: {
          locals: {
            validatedCase: { id: '1234567890123456', data: hc ? hcAt(hc) : {} },
          },
        },
      }) as Request;
      const res = {
        render: jest.fn(),
        locals: req.res!.locals,
      } as unknown as Response;
      req.res = res;

      const gc = step.getController;
      const controller: GetController =
        typeof gc === 'function' ? (gc as (lang?: SupportedLang) => GetController)() : gc;
      await controller.get(req, res);
      return (res.render as jest.Mock).mock.calls[0][1] as UcStepRenderData;
    };

    it('pre-populates yes + date when saved with a date (came from this screen)', async () => {
      const data = await render({ universalCredit: 'YES', ucApplicationDate: '2024-02-10' });
      expect(data.fieldValues.haveAppliedForUniversalCredit).toBe('yes');
      expect(data['haveAppliedForUniversalCredit.ucApplicationDate']).toEqual({
        day: '10',
        month: '02',
        year: '2024',
      });
    });

    it('pre-populates no when NO is saved (came from this screen)', async () => {
      const data = await render({ universalCredit: 'NO' });
      expect(data.fieldValues.haveAppliedForUniversalCredit).toBe('no');
      expect(data['haveAppliedForUniversalCredit.ucApplicationDate']).toBeFalsy();
    });

    it('does not pre-populate when YES is saved without a date (implicit from regular-income)', async () => {
      const data = await render({ universalCredit: 'YES' });
      expect(data.fieldValues.haveAppliedForUniversalCredit).toBeFalsy();
      expect(data['haveAppliedForUniversalCredit.ucApplicationDate']).toBeFalsy();
    });

    it('does not pre-populate when nothing is saved', async () => {
      const data = await render(undefined);
      expect(data.fieldValues.haveAppliedForUniversalCredit).toBeFalsy();
    });
  });

  it('throws when selection is yes and date fields are missing', async () => {
    (validateForm as jest.Mock).mockReturnValue({});
    const req = createReq({
      body: {
        action: 'continue',
        haveAppliedForUniversalCredit: 'yes',
        'haveAppliedForUniversalCredit.ucApplicationDate-day': '10',
        'haveAppliedForUniversalCredit.ucApplicationDate-year': '2024',
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;
    const next = jest.fn();

    if (!step.postController) {
      throw new Error('expected postController');
    }

    await step.postController.post(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(mockBuildCcdCaseForPossessionClaimResponse).not.toHaveBeenCalled();
  });
});
