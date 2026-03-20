import type { Request, Response } from 'express';

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock('@modules/logger', () => ({
  Logger: {
    getLogger: jest.fn(() => mockLogger),
  },
}));

const mockUpdateDraftRespondToClaim = jest.fn();
jest.mock('../../../main/services/ccdCaseService', () => ({
  ccdCaseService: {
    updateDraftRespondToClaim: mockUpdateDraftRespondToClaim,
  },
}));

import {
  STEP_FIELD_MAPPING,
  autoSaveToCCD,
  dateToISO,
  multipleYesNo,
  passThrough,
  yesNoEnum,
  yesNoNotSureEnum,
} from '../../../main/middleware/autoSaveDraftToCCD';

function createReqRes(params: {
  stepName: string;
  sessionFormData: Record<string, unknown>;
  validatedCaseId?: string;
  accessToken?: string;
}): { req: Partial<Request>; res: Partial<Response> } {
  const { stepName, sessionFormData } = params;
  const validatedCaseId = 'validatedCaseId' in params ? params.validatedCaseId : 'ccd-case-id';
  const accessToken = 'accessToken' in params ? params.accessToken : 'access-token';

  return {
    req: {
      session: {
        user: accessToken ? { accessToken } : undefined,
        formData: {
          [stepName]: sessionFormData,
        },
      },
    } as unknown as Partial<Request>,
    res: {
      locals: validatedCaseId
        ? {
            validatedCase: {
              id: validatedCaseId,
            },
          }
        : {},
    } as Partial<Response>,
  };
}

describe('autoSaveDraftToCCD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateDraftRespondToClaim.mockResolvedValue({ id: 'ccd-case-id', data: {} });
  });

  describe('yesNoEnum', () => {
    it('maps yes/no/preferNotToSay to CCD uppercase values', () => {
      expect(yesNoEnum('field')('yes')).toEqual({ field: 'YES' });
      expect(yesNoEnum('field')('no')).toEqual({ field: 'NO' });
      expect(yesNoEnum('field')('preferNotToSay')).toEqual({ field: 'PREFER_NOT_TO_SAY' });
    });

    it('returns empty string when value is not a string', () => {
      expect(yesNoEnum('field')(['yes'] as unknown as string)).toEqual({ field: '' });
      expect(mockLogger.warn).toHaveBeenCalledWith('yesNoEnum expects a string, received:', 'object');
    });

    it('returns empty string when value is not an allowed enum value', () => {
      expect(yesNoEnum('field')('maybe')).toEqual({ field: '' });
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('yesNoEnum: Invalid value'));
    });
  });

  describe('yesNoNotSureEnum', () => {
    it('maps yes/no/imNotSure to CCD uppercase values', () => {
      expect(yesNoNotSureEnum('field')('yes')).toEqual({ field: 'YES' });
      expect(yesNoNotSureEnum('field')('no')).toEqual({ field: 'NO' });
      expect(yesNoNotSureEnum('field')('imNotSure')).toEqual({ field: 'NOT_SURE' });
    });

    it('returns empty string when value is not a string', () => {
      expect(yesNoNotSureEnum('field')({} as unknown as string)).toEqual({ field: '' });
      expect(mockLogger.warn).toHaveBeenCalledWith('yesNoNotSureEnum expects a string, received:', 'object');
    });

    it('returns empty string when value is not an allowed enum value', () => {
      expect(yesNoNotSureEnum('field')('maybe')).toEqual({ field: '' });
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('yesNoNotSureEnum: Invalid value'));
    });
  });

  describe('dateToISO', () => {
    it('returns empty object when given a string', () => {
      expect(dateToISO('dateField')('not a date' as unknown as Record<string, unknown>)).toEqual({});
    });

    it('returns empty object when a date component is missing', () => {
      expect(dateToISO('dateField')({ day: '1', month: '2' } as unknown as Record<string, unknown>)).toEqual({});
    });

    it('returns empty object when the date is invalid', () => {
      expect(
        dateToISO('dateField')({
          day: '31',
          month: '2',
          year: '2025',
        } as unknown as Record<string, unknown>)
      ).toEqual({});
    });

    it('returns ISO date when given valid components', () => {
      expect(
        dateToISO('dateField')({
          day: '16',
          month: '6',
          year: '2025',
        } as unknown as Record<string, unknown>)
      ).toEqual({ dateField: '2025-06-16' });
    });
  });

  describe('passThrough', () => {
    it('returns empty object when input is not an object', () => {
      expect(passThrough(['a'])(['x'] as unknown as Record<string, unknown>)).toEqual({});
    });

    it('filters out empty values', () => {
      expect(passThrough(['a', 'b'])({ a: '', b: 'x' })).toEqual({ b: 'x' });
    });
  });

  describe('multipleYesNo', () => {
    it('returns empty array when input is not an array', () => {
      expect(multipleYesNo('field')('nope' as unknown as string[])).toEqual({ field: [] });
    });

    it('transforms camelCase values to CCD underscore uppercase format', () => {
      expect(multipleYesNo('field')(['preferNotToSay', 'anyPaymentsMade'])).toEqual({
        field: ['PREFER_NOT_TO_SAY', 'ANY_PAYMENTS_MADE'],
      });
    });
  });

  describe('autoSaveToCCD', () => {
    it('skips when step is not configured in STEP_FIELD_MAPPING', async () => {
      const { req, res } = createReqRes({
        stepName: 'unknown-step',
        sessionFormData: { foo: 'bar' },
      });

      await autoSaveToCCD(req as Request, res as Response, 'unknown-step');
      expect(mockUpdateDraftRespondToClaim).not.toHaveBeenCalled();
    });

    it('skips when form data for the step is missing/empty', async () => {
      const { req, res } = createReqRes({
        stepName: 'installment-payments',
        sessionFormData: {},
      });

      await autoSaveToCCD(req as Request, res as Response, 'installment-payments');
      expect(mockUpdateDraftRespondToClaim).not.toHaveBeenCalled();
    });

    it('skips when validated case id is missing', async () => {
      const { req, res } = createReqRes({
        stepName: 'installment-payments',
        sessionFormData: { confirmInstallmentOffer: 'yes' },
        validatedCaseId: undefined,
      });

      await autoSaveToCCD(req as Request, res as Response, 'installment-payments');
      expect(mockUpdateDraftRespondToClaim).not.toHaveBeenCalled();
    });

    it('throws when access token is missing from the session', async () => {
      const { req, res } = createReqRes({
        stepName: 'installment-payments',
        sessionFormData: { confirmInstallmentOffer: 'yes' },
        accessToken: undefined,
      });

      await expect(autoSaveToCCD(req as Request, res as Response, 'installment-payments')).rejects.toThrow(
        'No access token available for CCD update'
      );
    });

    it('saves for frontendField mappings using nested CCD payload', async () => {
      const { req, res } = createReqRes({
        stepName: 'installment-payments',
        sessionFormData: { confirmInstallmentOffer: 'yes' },
      });

      await autoSaveToCCD(req as Request, res as Response, 'installment-payments');

      expect(mockUpdateDraftRespondToClaim).toHaveBeenCalledWith('access-token', 'ccd-case-id', {
        possessionClaimResponse: {
          paymentAgreement: {
            repayArrearsInstalments: 'YES',
          },
        },
      });
    });

    it('skips frontendField mapping when configured field is missing', async () => {
      const { req, res } = createReqRes({
        stepName: 'installment-payments',
        sessionFormData: { otherField: 'value' },
      });

      await autoSaveToCCD(req as Request, res as Response, 'installment-payments');
      expect(mockUpdateDraftRespondToClaim).not.toHaveBeenCalled();
    });

    it('saves for frontendFields mappings (instalments) using nested CCD payload', async () => {
      const { req, res } = createReqRes({
        stepName: 'how-much-afford-to-pay',
        sessionFormData: {
          installmentAmount: '148.50',
          installmentFrequency: 'monthly',
        },
      });

      await autoSaveToCCD(req as Request, res as Response, 'how-much-afford-to-pay');

      expect(mockUpdateDraftRespondToClaim).toHaveBeenCalledWith('access-token', 'ccd-case-id', {
        possessionClaimResponse: {
          paymentAgreement: {
            additionalRentContribution: 148.5,
            additionalContributionFrequency: 'monthly',
          },
        },
      });
    });

    it('skips frontendFields mapping when none of the configured fields are present', async () => {
      const { req, res } = createReqRes({
        stepName: 'how-much-afford-to-pay',
        sessionFormData: { otherField: 'value' },
      });

      await autoSaveToCCD(req as Request, res as Response, 'how-much-afford-to-pay');
      expect(mockUpdateDraftRespondToClaim).not.toHaveBeenCalled();
    });

    it('maps repayments-made values to CCD payload', async () => {
      const { req, res } = createReqRes({
        stepName: 'repayments-made',
        sessionFormData: {
          confirmRepaymentsMade: 'no',
          repaymentsInfo: '  some payment details  ',
        },
      });

      await autoSaveToCCD(req as Request, res as Response, 'repayments-made');

      expect(mockUpdateDraftRespondToClaim).toHaveBeenCalledWith('access-token', 'ccd-case-id', {
        possessionClaimResponse: {
          paymentAgreement: {
            anyPaymentsMade: 'NO',
            paymentDetails: 'some payment details',
          },
        },
      });
    });

    it('maps repayments-agreed values to CCD payload (including NOT_SURE)', async () => {
      const { req, res } = createReqRes({
        stepName: 'repayments-agreed',
        sessionFormData: {
          confirmRepaymentsAgreed: 'imNotSure',
          repaymentsAgreementInfo: 'agreement details',
        },
      });

      await autoSaveToCCD(req as Request, res as Response, 'repayments-agreed');

      expect(mockUpdateDraftRespondToClaim).toHaveBeenCalledWith('access-token', 'ccd-case-id', {
        possessionClaimResponse: {
          paymentAgreement: {
            repaymentPlanAgreed: 'NOT_SURE',
            repaymentAgreedDetails: 'agreement details',
          },
        },
      });
    });

    it('warns (and skips) when instalmentAmount is non-numeric', async () => {
      const { req, res } = createReqRes({
        stepName: 'how-much-afford-to-pay',
        sessionFormData: {
          installmentAmount: 'not-a-number',
          installmentFrequency: 'monthly',
        },
      });

      await autoSaveToCCD(req as Request, res as Response, 'how-much-afford-to-pay');

      expect(mockUpdateDraftRespondToClaim).toHaveBeenCalledWith('access-token', 'ccd-case-id', {
        possessionClaimResponse: {
          paymentAgreement: {
            // amount mapping should be skipped, but frequency should still be mapped
            additionalContributionFrequency: 'monthly',
          },
        },
      });
      expect(mockLogger.warn).toHaveBeenCalledWith('instalmentsMapper received non-numeric installmentAmount');
    });

    it('covers saveToCCD else-branch when a config has neither frontendField nor frontendFields', async () => {
      // SonarQube/coverage wants this branch, but STEP_FIELD_MAPPING currently always supplies one.
      // We temporarily inject a mapping to exercise the code path safely and then restore it.
      const testStepName = 'test-step-no-frontend-fields';
      const original = STEP_FIELD_MAPPING[testStepName];

      (STEP_FIELD_MAPPING as Record<string, unknown>)[testStepName] = {
        backendPath: 'possessionClaimResponse.paymentAgreement',
        valueMapper: () => ({ testLeafField: 'OK' }),
      };

      const { req, res } = createReqRes({
        stepName: testStepName,
        sessionFormData: { any: 'thing' },
      });

      await autoSaveToCCD(req as Request, res as Response, testStepName);

      expect(mockUpdateDraftRespondToClaim).toHaveBeenCalledWith('access-token', 'ccd-case-id', {
        possessionClaimResponse: {
          paymentAgreement: {
            testLeafField: 'OK',
          },
        },
      });

      if (original === undefined) {
        delete (STEP_FIELD_MAPPING as Record<string, unknown>)[testStepName];
      } else {
        (STEP_FIELD_MAPPING as Record<string, unknown>)[testStepName] = original;
      }
    });

    it('does not throw when CCD update fails (internal error is swallowed)', async () => {
      mockUpdateDraftRespondToClaim.mockRejectedValue(new Error('CCD error'));

      const { req, res } = createReqRes({
        stepName: 'installment-payments',
        sessionFormData: { confirmInstallmentOffer: 'yes' },
      });

      await expect(autoSaveToCCD(req as Request, res as Response, 'installment-payments')).resolves.toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[installment-payments] Failed to save draft to CCD:',
        expect.any(Error)
      );
    });
  });
});
