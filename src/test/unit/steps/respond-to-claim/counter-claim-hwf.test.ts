jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
}));

const mockBuildCcdCaseForPossessionClaimResponse = jest.fn();
jest.mock('../../../../main/steps/utils/populateResponseToClaimPayloadmap', () => ({
  buildCcdCaseForPossessionClaimResponse: mockBuildCcdCaseForPossessionClaimResponse,
}));

import { step } from '../../../../main/steps/respond-to-claim/counter-claim-have-you-already-applied-for-help-with-your-fees';
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

describe('respond-to-claim counter-claim-have-you-already-applied-for-help-with-your-fees', () => {
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

      expect(mockBuildCcdCaseForPossessionClaimResponse).toHaveBeenCalledWith(req, {
        defendantResponses: {
          counterClaim: {
            appliedForHwf: 'YES',
            hwfReferenceNumber: 'HWF-A1B-23C',
          },
        },
      });
    });

    it('saves NO with empty HWF reference number', async () => {
      const req = {
        body: {
          alreadyAppliedForHelp: 'no',
        },
      };

      await testedStep.beforeRedirect(req);

      expect(mockBuildCcdCaseForPossessionClaimResponse).toHaveBeenCalledWith(req, {
        defendantResponses: {
          counterClaim: {
            appliedForHwf: 'NO',
            hwfReferenceNumber: '',
          },
        },
      });
    });

    it('does not persist when selection is missing', async () => {
      const req = { body: {} };

      await testedStep.beforeRedirect(req);

      expect(mockBuildCcdCaseForPossessionClaimResponse).not.toHaveBeenCalled();
    });

    it('does not persist when body is undefined', async () => {
      const req = { body: undefined };

      await testedStep.beforeRedirect(req);

      expect(mockBuildCcdCaseForPossessionClaimResponse).not.toHaveBeenCalled();
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

describe('respond-to-claim counter-claim HWF routing', () => {
  const stepConfig = flowConfig.steps['counter-claim-have-you-already-applied-for-help-with-your-fees'];
  const routes = stepConfig.routes || [];
  const yesRouteCondition = routes[0]?.condition;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const req = {} as any;

  it('routes to payment-interstitial when user answers YES', async () => {
    if (!yesRouteCondition) {
      throw new Error('expected yes route condition');
    }
    const result = await yesRouteCondition(req, {}, { alreadyAppliedForHelp: 'yes' });

    expect(result).toBe(true);
    expect(routes[0]?.nextStep).toBe('payment-interstitial');
  });

  it('does not route to payment-interstitial when user answers NO', async () => {
    if (!yesRouteCondition) {
      throw new Error('expected yes route condition');
    }
    const result = await yesRouteCondition(req, {}, { alreadyAppliedForHelp: 'no' });
    expect(result).toBe(false);
  });

  it('falls through to counter-claim-you-need-to-apply as default next', () => {
    expect(stepConfig.defaultNext).toBe('counter-claim-you-need-to-apply-for-help-with-your-fees');
  });

  it('uses counter-claim as previous step', () => {
    expect(stepConfig.previousStep).toBe('counter-claim');
  });
});
