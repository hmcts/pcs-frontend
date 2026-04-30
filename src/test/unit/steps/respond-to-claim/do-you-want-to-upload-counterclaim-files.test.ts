jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

import { step } from '../../../../main/steps/respond-to-claim/do-you-want-to-upload-counterclaim-files';

type ChoiceStep = {
  getInitialFormData: (req: Record<string, unknown>) => Record<string, unknown>;
  beforeRedirect?: (req: Record<string, unknown>) => Promise<void>;
  fields: {
    name: string;
    type: string;
    required: boolean;
    options: { value: string; translationKey: string }[];
  }[];
  stepName: string;
  translationKeys: Record<string, string>;
};

describe('do-you-want-to-upload-counterclaim-files step', () => {
  const testedStep = step as unknown as ChoiceStep;

  describe('step config', () => {
    it('has correct step name', () => {
      expect(testedStep.stepName).toBe('do-you-want-to-upload-counterclaim-files');
    });

    it('declares a required radio field with YES/NO options', () => {
      expect(testedStep.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'wantsToUploadCounterClaimDocs',
            type: 'radio',
            required: true,
            options: [
              { value: 'YES', translationKey: 'options.yes' },
              { value: 'NO', translationKey: 'options.no' },
            ],
          }),
        ])
      );
    });

    it('does not persist the choice to CCD (no beforeRedirect)', () => {
      expect(testedStep.beforeRedirect).toBeUndefined();
    });
  });

  describe('getInitialFormData', () => {
    const makeReq = (counterClaimDocuments?: unknown[]) => ({
      res: {
        locals: {
          validatedCase: {
            possessionClaimResponse: {
              defendantResponses: { counterClaimDocuments },
            },
          },
        },
      },
    });

    it('returns empty when no counterclaim docs exist (unanswered)', () => {
      expect(testedStep.getInitialFormData(makeReq(undefined))).toEqual({});
    });

    it('returns empty when counterclaim docs array is empty', () => {
      expect(testedStep.getInitialFormData(makeReq([]))).toEqual({});
    });

    it('pre-populates YES when at least one counterclaim doc exists', () => {
      const docs = [{ id: 'd1', value: { document: { document_filename: 'a.pdf' } } }];
      expect(testedStep.getInitialFormData(makeReq(docs))).toEqual({
        wantsToUploadCounterClaimDocs: 'YES',
      });
    });

    it('returns empty when validatedCase is missing entirely', () => {
      expect(testedStep.getInitialFormData({} as Record<string, unknown>)).toEqual({});
    });
  });
});
