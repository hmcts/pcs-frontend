jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

jest.mock('../../../../main/services/ccdCaseService', () => ({
  ccdCaseService: {
    getCaseById: jest.fn(),
    updateDraft: jest.fn(),
  },
}));

import { step } from '../../../../main/steps/respond-to-claim/counter-claim';

type CounterClaimStep = {
  getInitialFormData: (req: Record<string, unknown>) => Promise<Record<string, unknown>>;
  beforeRedirect?: (req: Record<string, unknown>) => Promise<void>;
  fields: { name: string; type: string; required: boolean }[];
  stepName: string;
  documentStorage: { read: jest.Mock; readFresh: jest.Mock; save: jest.Mock };
  translationKeys: Record<string, string>;
};

describe('counter-claim step (counterclaim docs upload)', () => {
  const testedStep = step as unknown as CounterClaimStep;

  describe('step config', () => {
    it('has correct step name', () => {
      expect(testedStep.stepName).toBe('counter-claim');
    });

    it('carries a documentStorage adapter with read, readFresh, save', () => {
      expect(typeof testedStep.documentStorage?.read).toBe('function');
      expect(typeof testedStep.documentStorage?.readFresh).toBe('function');
      expect(typeof testedStep.documentStorage?.save).toBe('function');
    });

    it('declares an optional file field (per Figma "optional")', () => {
      expect(testedStep.fields).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'documents', type: 'file', required: false })])
      );
    });

    it('does not have beforeRedirect — saves on upload/delete via documentProxy', () => {
      expect(testedStep.beforeRedirect).toBeUndefined();
    });
  });

  describe('getInitialFormData', () => {
    const makeReq = (counterClaimDocuments?: unknown[]) => ({
      session: { user: { accessToken: 'token' } },
      params: { caseReference: '123' },
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

    it('returns empty documents when no documents exist', async () => {
      expect(await testedStep.getInitialFormData(makeReq(undefined))).toEqual({ documents: [] });
    });

    it('returns empty documents when documents array is empty', async () => {
      expect(await testedStep.getInitialFormData(makeReq([]))).toEqual({ documents: [] });
    });

    it('maps existing documents to display format', async () => {
      const docs = [
        {
          id: 'doc-1',
          value: {
            document: { document_filename: 'evidence.pdf' },
            contentType: 'application/pdf',
            size: 1234,
          },
        },
      ];
      expect(await testedStep.getInitialFormData(makeReq(docs))).toEqual({
        documents: [
          {
            index: 0,
            id: 'doc-1',
            document_filename: 'evidence.pdf',
            content_type: 'application/pdf',
            size: 1234,
          },
        ],
      });
    });
  });
});
