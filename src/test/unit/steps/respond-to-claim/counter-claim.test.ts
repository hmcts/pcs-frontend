jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

import { step } from '../../../../main/steps/respond-to-claim/counter-claim';

type CounterClaimStep = {
  getInitialFormData: (req: Record<string, unknown>) => Record<string, unknown>;
  extendGetContent: (req: Record<string, unknown>, formContent: Record<string, unknown>) => Record<string, unknown>;
  beforeRedirect?: (req: Record<string, unknown>) => Promise<void>;
  fields: { name: string; type: string; required: boolean }[];
  stepName: string;
  uploadDocsPath: readonly string[];
  translationKeys: Record<string, string>;
};

describe('counter-claim step (counterclaim docs upload)', () => {
  const testedStep = step as unknown as CounterClaimStep;

  describe('step config', () => {
    it('has correct step name', () => {
      expect(testedStep.stepName).toBe('counter-claim');
    });

    it('declares uploadDocsPath at counterClaimDocuments', () => {
      expect(testedStep.uploadDocsPath).toEqual([
        'possessionClaimResponse',
        'defendantResponses',
        'counterClaimDocuments',
      ]);
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

    it('returns empty when no documents exist', () => {
      expect(testedStep.getInitialFormData(makeReq(undefined))).toEqual({});
    });

    it('returns empty when documents array is empty', () => {
      expect(testedStep.getInitialFormData(makeReq([]))).toEqual({});
    });

    it('maps existing documents to display format', () => {
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
      expect(testedStep.getInitialFormData(makeReq(docs))).toEqual({
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

  describe('extendGetContent', () => {
    it('wires upload and delete URLs onto the file field component', () => {
      const formContent = {
        fields: [{ componentType: 'fileUpload', component: {} as Record<string, unknown> }],
      };
      const req = { originalUrl: '/case/123/respond-to-claim/counter-claim?lang=cy' };

      testedStep.extendGetContent(req, formContent);

      expect(formContent.fields[0].component).toEqual({
        uploadUrl: '/case/123/respond-to-claim/counter-claim/upload',
        deleteUrl: '/case/123/respond-to-claim/counter-claim/delete',
      });
    });
  });
});
