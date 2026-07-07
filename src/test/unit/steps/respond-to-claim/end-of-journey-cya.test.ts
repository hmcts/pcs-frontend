import type { Request } from 'express';

import { step as stepOriginal } from '../../../../main/steps/respond-to-claim/end-of-journey-cya';
import {
  buildDraftDefendantResponse,
  saveDraftDefendantResponse,
} from '../../../../main/steps/utils/buildDraftDefendantResponse';
import { safeRedirect307 } from '../../../../main/utils/safeRedirect';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const step = stepOriginal as any;

jest.mock('../../../../main/steps/utils/buildDraftDefendantResponse', () => ({
  buildDraftDefendantResponse: jest.fn(() => ({
    defendantResponses: {
      completedSections: [],
    },
  })),
  saveDraftDefendantResponse: jest.fn(),
}));

jest.mock('../../../../main/utils/safeRedirect', () => ({
  safeRedirect307: jest.fn(),
}));

jest.mock('../../../../main/steps/respond-to-claim/end-of-journey-cya/buildEndOfJourneyCyaRows', () => ({
  buildEndOfJourneyCyaSections: jest.fn(() => []),
}));

jest.mock('@modules/steps', () => ({
  createFormStep: jest.fn(config => ({
    ...config,
    name: config.stepName,
    url: `/case/:caseReference/respond-to-claim/${config.stepName}`,
    view: config.customTemplate || 'formBuilder.njk',
  })),
  getTranslationFunction: jest.fn(() => (key: string) => key),
  loadStepNamespaces: jest.fn(),
}));

describe('respond-to-claim end-of-journey-cya step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes correct step metadata', () => {
    expect(step.name).toBe('end-of-journey-cya');
    expect(step.url).toBe('/case/:caseReference/respond-to-claim/end-of-journey-cya');
    expect(step.view).toContain('endOfJourneyCya.njk');
  });

  describe('Form Fields configuration & validation', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fields = step.fields as any[];

    it('defines statementOfTruthContempt checkbox with conditional requirement', () => {
      const contemptField = fields.find(f => f.name === 'statementOfTruthContempt')!;
      expect(contemptField.type).toBe('checkbox');

      // Required for citizens (isLegalRepresentative !== 'true')
      expect(typeof contemptField.required).toBe('function');
      const isRequiredCitizen = (contemptField.required as (formData: Record<string, unknown>) => boolean)({
        isLegalRepresentative: 'false',
      });
      expect(isRequiredCitizen).toBe(true);

      // Not required for legal representatives (isLegalRepresentative === 'true')
      const isRequiredLR = (contemptField.required as (formData: Record<string, unknown>) => boolean)({
        isLegalRepresentative: 'true',
      });
      expect(isRequiredLR).toBe(false);
    });

    it('defines statementOfTruthBelief checkbox as unconditionally required', () => {
      const beliefField = fields.find(f => f.name === 'statementOfTruthBelief')!;
      expect(beliefField.type).toBe('checkbox');
      expect(beliefField.required).toBe(true);
    });

    it('defines fullName as required with maxLength of 100', () => {
      const nameField = fields.find(f => f.name === 'fullName')!;
      expect(nameField.type).toBe('text');
      expect(nameField.required).toBe(true);
      expect(nameField.maxLength).toBe(100);
    });

    it('defines nameOfFirm as conditionally required with maxLength of 100', () => {
      const firmField = fields.find(f => f.name === 'nameOfFirm')!;
      expect(firmField.type).toBe('text');
      expect(firmField.maxLength).toBe(100);

      expect(typeof firmField.required).toBe('function');
      const isRequiredCitizen = (firmField.required as (formData: Record<string, unknown>) => boolean)({
        isLegalRepresentative: 'false',
      });
      expect(isRequiredCitizen).toBe(false);

      const isRequiredLR = (firmField.required as (formData: Record<string, unknown>) => boolean)({
        isLegalRepresentative: 'true',
      });
      expect(isRequiredLR).toBe(true);
    });

    it('defines positionHeld as conditionally required with maxLength of 100', () => {
      const positionField = fields.find((f: { name: string }) => f.name === 'positionHeld')!;
      expect(positionField.type).toBe('text');
      expect(positionField.maxLength).toBe(100);

      expect(typeof positionField.required).toBe('function');
      const isRequiredCitizen = (positionField.required as (formData: Record<string, unknown>) => boolean)({
        isLegalRepresentative: 'false',
      });
      expect(isRequiredCitizen).toBe(false);

      const isRequiredLR = (positionField.required as (formData: Record<string, unknown>) => boolean)({
        isLegalRepresentative: 'true',
      });
      expect(isRequiredLR).toBe(true);
    });
  });

  describe('getInitialFormData', () => {
    it('returns empty object when no statementOfTruth exists in case', () => {
      const req = {
        res: {
          locals: {
            validatedCase: {
              possessionClaimResponse: {
                defendantResponses: {},
              },
            },
          },
        },
      } as unknown as Request;

      const initialData = step.getInitialFormData!(req);
      expect(initialData).toEqual({});
    });

    it('prepopulates fields for citizen user when statementOfTruth exists', () => {
      const req = {
        res: {
          locals: {
            validatedCase: {
              possessionClaimResponse: {
                defendantResponses: {
                  statementOfTruth: {
                    accepted: 'YES',
                    fullName: 'John Doe',
                  },
                },
              },
            },
          },
        },
      } as unknown as Request;

      const initialData = step.getInitialFormData!(req);
      expect(initialData).toEqual({
        statementOfTruthContempt: ['yes'],
        statementOfTruthBelief: ['yes'],
        fullName: 'John Doe',
      });
    });

    it('prepopulates fields for legal representative when statementOfTruth exists', () => {
      const req = {
        res: {
          locals: {
            validatedCase: {
              possessionClaimResponse: {
                defendantResponses: {
                  statementOfTruth: {
                    accepted: 'YES',
                    fullName: 'Jane Smith',
                    nameOfFirm: 'Smith & Partners',
                    positionHeld: 'Partner',
                  },
                },
              },
            },
          },
        },
      } as unknown as Request;

      const initialData = step.getInitialFormData!(req);
      expect(initialData).toEqual({
        statementOfTruthContempt: ['yes'],
        statementOfTruthBelief: ['yes'],
        fullName: 'Jane Smith',
        nameOfFirm: 'Smith & Partners',
        positionHeld: 'Partner',
      });
    });
  });

  describe('extendGetContent', () => {
    it('sets correct context and overrides fields for legal representative', async () => {
      const req = {
        query: {},
        res: {
          locals: {
            isLegalRepresentative: true,
            validatedCase: {
              data: {
                possessionClaimResponse: {
                  defendantResponses: {
                    status: 'IN_PROGRESS',
                  },
                },
              },
            },
          },
        },
      } as unknown as Request;

      // Mock FormContent's fields array
      const formContent = {
        fields: [
          { name: 'statementOfTruthBelief', component: { items: [{ text: '' }], errorMessage: { text: '' } } },
          { name: 'fullName', component: { label: { text: '' } } },
        ],
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extended = await step.extendGetContent!(req, formContent as any);

      expect(extended).toEqual(
        expect.objectContaining({
          submitDisabled: false,
          isLegalRepresentative: true,
        })
      );

      // Verify legal-rep specific overrides are applied to component objects
      const beliefField = formContent.fields.find(f => f.name === 'statementOfTruthBelief')!;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((beliefField.component as any).items[0].text).toBe('statementOfTruth.legalRepBeliefOption');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((beliefField.component as any).errorMessage.text).toBe('errors.legalRepStatementOfTruthBelief');

      const fullNameField = formContent.fields.find(f => f.name === 'fullName')!;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((fullNameField.component as any).label.text).toBe('statementOfTruth.legalRepFullNameLabel');
    });

    it('returns submitError summary when query contains submitError=failed', async () => {
      const req = {
        query: { submitError: 'failed' },
        res: {
          locals: {
            isLegalRepresentative: false,
            validatedCase: {
              data: {
                possessionClaimResponse: {
                  defendantResponses: {
                    status: 'SUBMITTED',
                  },
                },
              },
            },
          },
        },
      } as unknown as Request;

      const extended = await step.extendGetContent!(req, { fields: [] });
      expect(extended).toEqual(
        expect.objectContaining({
          submitDisabled: true,
          isLegalRepresentative: false,
          errorSummary: expect.objectContaining({
            titleText: 'There is a problem',
            errorList: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('beforeRedirect', () => {
    it('saves draft and redirects 307 for citizen user', async () => {
      const req = {
        body: {
          statementOfTruthContempt: ['yes'],
          statementOfTruthBelief: ['yes'],
          fullName: ' John Citizen  ',
        },
        res: {
          locals: {
            isLegalRepresentative: false,
            validatedCase: {
              id: '123456789',
            },
          },
        },
      } as unknown as Request;

      await step.beforeRedirect!(req);

      expect(buildDraftDefendantResponse).toHaveBeenCalledWith(req);
      expect(saveDraftDefendantResponse).toHaveBeenCalledWith(
        req,
        expect.objectContaining({
          defendantResponses: expect.objectContaining({
            statementOfTruth: {
              accepted: 'YES',
              fullName: 'John Citizen',
            },
            completedSections: ['CHECK_YOUR_ANSWERS_AND_SUBMIT'],
          }),
        })
      );

      expect(safeRedirect307).toHaveBeenCalledWith(
        req.res,
        '/case/123456789/final-submit',
        '/case/123456789/respond-to-claim/end-of-journey-cya',
        ['/case']
      );
    });

    it('saves draft and redirects 307 for legal representative', async () => {
      const req = {
        body: {
          statementOfTruthBelief: ['yes'],
          fullName: ' Jane Solicitor ',
          nameOfFirm: ' Legal Partners ',
          positionHeld: ' Partner ',
        },
        res: {
          locals: {
            isLegalRepresentative: true,
            validatedCase: {
              id: '987654321',
            },
          },
        },
      } as unknown as Request;

      await step.beforeRedirect!(req);

      expect(buildDraftDefendantResponse).toHaveBeenCalledWith(req);
      expect(saveDraftDefendantResponse).toHaveBeenCalledWith(
        req,
        expect.objectContaining({
          defendantResponses: expect.objectContaining({
            statementOfTruth: {
              accepted: 'YES',
              fullName: 'Jane Solicitor',
              nameOfFirm: 'Legal Partners',
              positionHeld: 'Partner',
            },
            completedSections: ['CHECK_YOUR_ANSWERS_AND_SUBMIT'],
          }),
        })
      );

      expect(safeRedirect307).toHaveBeenCalledWith(
        req.res,
        '/case/987654321/final-submit',
        '/case/987654321/respond-to-claim/end-of-journey-cya',
        ['/case']
      );
    });
  });
});
