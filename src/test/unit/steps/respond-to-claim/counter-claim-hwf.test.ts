jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
}));

const mockSaveDraftDefendantResponse = jest.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockBuildDraftDefendantResponse = jest.fn<any, any>(() => ({
  defendantResponses: {
    makeCounterClaim: 'YES' as const,
    counterClaim: undefined as Record<string, unknown> | undefined,
  },
}));
jest.mock('../../../../main/steps/utils/buildDraftDefendantResponse', () => ({
  saveDraftDefendantResponse: mockSaveDraftDefendantResponse,
  buildDraftDefendantResponse: mockBuildDraftDefendantResponse,
}));

import { step } from '../../../../main/steps/respond-to-claim/counter-claim-have-you-applied-for-help';
import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';

type CounterClaimHwfStep = {
  getInitialFormData: (req: {
    res?: {
      locals?: {
        validatedCase?: {
          data?: {
            possessionClaimResponse?: {
              defendantResponses?: {
                counterClaim?: {
                  appliedForHwf?: string;
                  hwfReferenceNumber?: string;
                };
              };
            };
          };
        };
      };
    };
  }) => Record<string, unknown>;
  beforeRedirect: (req: { body?: Record<string, unknown> }) => Promise<void>;
};

const testedStep = step as unknown as CounterClaimHwfStep;

describe('respond-to-claim counter-claim-have-you-applied-for-help', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('beforeRedirect (CCD payload writes)', () => {
    it('saves YES with HWF reference number', async () => {
      const req = {
        body: {
          alreadyAppliedForHelp: 'yes',
          'alreadyAppliedForHelp.hwfReference': 'HWF-A1B-23C',
        },
      };

      await testedStep.beforeRedirect(req);

      expect(mockSaveDraftDefendantResponse).toHaveBeenCalledWith(req, {
        defendantResponses: {
          makeCounterClaim: 'YES',
          counterClaim: {
            appliedForHwf: 'YES',
            hwfReferenceNumber: 'HWF-A1B-23C',
          },
        },
      });
    });

    it('saves NO without HWF reference number', async () => {
      const req = {
        body: {
          alreadyAppliedForHelp: 'no',
        },
      };

      await testedStep.beforeRedirect(req);

      expect(mockSaveDraftDefendantResponse).toHaveBeenCalledWith(req, {
        defendantResponses: {
          makeCounterClaim: 'YES',
          counterClaim: {
            appliedForHwf: 'NO',
          },
        },
      });
    });

    it('clears appliedForHwf + hwfReferenceNumber and saves when selection is missing', async () => {
      const req = { body: {} };

      await testedStep.beforeRedirect(req);

      // Holistic-save rule 5: always save. Rule 3: DELETE the field when cleared.
      expect(mockSaveDraftDefendantResponse).toHaveBeenCalledTimes(1);
      const saved = mockSaveDraftDefendantResponse.mock.calls[0][1];
      expect(saved.defendantResponses.counterClaim.appliedForHwf).toBeUndefined();
      expect(saved.defendantResponses.counterClaim.hwfReferenceNumber).toBeUndefined();
    });

    it('clears appliedForHwf + hwfReferenceNumber and saves when body is undefined', async () => {
      const req = { body: undefined };

      await testedStep.beforeRedirect(req);

      expect(mockSaveDraftDefendantResponse).toHaveBeenCalledTimes(1);
      const saved = mockSaveDraftDefendantResponse.mock.calls[0][1];
      expect(saved.defendantResponses.counterClaim.appliedForHwf).toBeUndefined();
      expect(saved.defendantResponses.counterClaim.hwfReferenceNumber).toBeUndefined();
    });

    it('clears hwfReferenceNumber when transitioning from YES to NO', async () => {
      // Mock returns a draft that already has appliedForHwf=YES + a stored reference number
      mockBuildDraftDefendantResponse.mockReturnValueOnce({
        defendantResponses: {
          makeCounterClaim: 'YES',
          counterClaim: { appliedForHwf: 'YES', hwfReferenceNumber: 'HWF-OLD-123' },
        },
      });
      const req = { body: { alreadyAppliedForHelp: 'no' } };

      await testedStep.beforeRedirect(req);

      const saved = mockSaveDraftDefendantResponse.mock.calls[0][1];
      expect(saved.defendantResponses.counterClaim.appliedForHwf).toBe('NO');
      // Rule 4: subfield cleared when parent option changes
      expect(saved.defendantResponses.counterClaim.hwfReferenceNumber).toBeUndefined();
    });
  });

  describe('hwfReference field config', () => {
    it('has maxLength 60 on hwfReference subfield, triggering hwfReferenceMaxLength locale key', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fields = (step as any).fields as {
        name: string;
        options?: { value: string; subFields?: Record<string, { maxLength?: number; errorMessage?: string }> }[];
      }[];
      const alreadyAppliedField = fields.find(f => f.name === 'alreadyAppliedForHelp');
      const yesOption = alreadyAppliedField?.options?.find(o => o.value === 'yes');
      const hwfReferenceSubfield = yesOption?.subFields?.['hwfReference'];

      expect(hwfReferenceSubfield?.maxLength).toBe(60);
      expect(hwfReferenceSubfield?.errorMessage).toBe('errors.hwfReference');
    });
  });

  describe('getInitialFormData (CCD pre-population)', () => {
    it('pre-populates YES with HWF reference from CCD', () => {
      const req = {
        res: {
          locals: {
            validatedCase: {
              data: {
                possessionClaimResponse: {
                  defendantResponses: {
                    counterClaim: {
                      appliedForHwf: 'YES',
                      hwfReferenceNumber: 'HWF-X9Y-88Z',
                    },
                  },
                },
              },
            },
          },
        },
      };

      expect(testedStep.getInitialFormData(req)).toEqual({
        alreadyAppliedForHelp: 'yes',
        'alreadyAppliedForHelp.hwfReference': 'HWF-X9Y-88Z',
      });
    });

    it('pre-populates YES with empty string when hwfReferenceNumber is missing', () => {
      const req = {
        res: {
          locals: {
            validatedCase: {
              data: {
                possessionClaimResponse: {
                  defendantResponses: {
                    counterClaim: {
                      appliedForHwf: 'YES',
                    },
                  },
                },
              },
            },
          },
        },
      };

      expect(testedStep.getInitialFormData(req)).toEqual({
        alreadyAppliedForHelp: 'yes',
        'alreadyAppliedForHelp.hwfReference': '',
      });
    });

    it('pre-populates NO without HWF reference', () => {
      const req = {
        res: {
          locals: {
            validatedCase: {
              data: {
                possessionClaimResponse: {
                  defendantResponses: {
                    counterClaim: {
                      appliedForHwf: 'NO',
                    },
                  },
                },
              },
            },
          },
        },
      };

      expect(testedStep.getInitialFormData(req)).toEqual({ alreadyAppliedForHelp: 'no' });
    });

    it('returns empty object when no CCD value exists', () => {
      const req = { res: { locals: { validatedCase: { data: {} } } } };
      expect(testedStep.getInitialFormData(req)).toEqual({});
    });

    it('returns empty object when validatedCase is missing', () => {
      const req = { res: { locals: {} } };
      expect(testedStep.getInitialFormData(req)).toEqual({});
    });
  });
});

describe('respond-to-claim counter-claim HWF show conditions', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const makeReq = (appliedForHwf: string | undefined): any => ({
    res: {
      locals: {
        validatedCase: {
          data: {
            possessionClaimResponse: {
              defendantResponses: {
                counterClaim: appliedForHwf !== undefined ? { appliedForHwf } : undefined,
              },
            },
          },
        },
      },
    },
  });

  describe('counter-claim-about showCondition', () => {
    const showCondition = flowConfig.steps['counter-claim-about']?.showCondition;

    it('is visible when appliedForHwf is YES', () => {
      expect(showCondition?.(makeReq('YES'))).toBe(true);
    });

    it('is not visible when appliedForHwf is NO', () => {
      expect(showCondition?.(makeReq('NO'))).toBe(false);
    });

    it('is not visible when counterClaim data is absent', () => {
      expect(showCondition?.(makeReq(undefined))).toBe(false);
    });
  });

  describe('counter-claim-you-need-to-apply showCondition', () => {
    const showCondition = flowConfig.steps['counter-claim-you-need-to-apply-for-help-with-your-fees']?.showCondition;

    const makeNeedToApplyReq = (
      counterClaim: { needHelpWithFees?: string; appliedForHwf?: string } | undefined
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): any => ({
      res: {
        locals: {
          validatedCase: {
            data: {
              possessionClaimResponse: {
                defendantResponses: {
                  counterClaim,
                },
              },
            },
          },
        },
      },
    });

    it('is visible when needHelpWithFees is YES and appliedForHwf is NO', () => {
      expect(showCondition?.(makeNeedToApplyReq({ needHelpWithFees: 'YES', appliedForHwf: 'NO' }))).toBe(true);
    });

    it('is not visible when appliedForHwf is YES', () => {
      expect(showCondition?.(makeNeedToApplyReq({ needHelpWithFees: 'YES', appliedForHwf: 'YES' }))).toBe(false);
    });

    it('is not visible when needHelpWithFees is not YES', () => {
      expect(showCondition?.(makeNeedToApplyReq({ appliedForHwf: 'NO' }))).toBe(false);
    });

    it('is not visible when counterClaim data is absent', () => {
      expect(showCondition?.(makeReq(undefined))).toBe(false);
    });
  });

  describe('counter-claim-have-you-applied-for-help showCondition', () => {
    const showCondition = flowConfig.steps['counter-claim-have-you-applied-for-help']?.showCondition;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const makeNeedHelpReq = (needHelpWithFees: string | undefined): any => ({
      res: {
        locals: {
          validatedCase: {
            data: {
              possessionClaimResponse: {
                defendantResponses: {
                  counterClaim: needHelpWithFees !== undefined ? { needHelpWithFees } : undefined,
                },
              },
            },
          },
        },
      },
    });

    it('is visible when needHelpWithFees is YES', () => {
      expect(showCondition?.(makeNeedHelpReq('YES'))).toBe(true);
    });

    it('is not visible when needHelpWithFees is NO', () => {
      expect(showCondition?.(makeNeedHelpReq('NO'))).toBe(false);
    });

    it('is not visible when needHelpWithFees is absent', () => {
      expect(showCondition?.(makeNeedHelpReq(undefined))).toBe(false);
    });
  });
});
