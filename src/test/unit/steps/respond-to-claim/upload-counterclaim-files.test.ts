jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

import { step } from '../../../../main/steps/respond-to-claim/upload-counterclaim-files';

type UploadCounterclaimStep = {
  getInitialFormData: (req: Record<string, unknown>) => Record<string, unknown>;
  extendGetContent: (req: Record<string, unknown>, formContent: Record<string, unknown>) => Record<string, unknown>;
  beforeRedirect?: (req: Record<string, unknown>) => Promise<void>;
  fields: { name: string; type: string; required: boolean }[];
  stepName: string;
  uploadDocsPath: readonly string[];
  translationKeys: Record<string, string>;
};

describe('upload-counterclaim-files step', () => {
  const testedStep = step as unknown as UploadCounterclaimStep;

  describe('step config', () => {
    it('has correct step name', () => {
      expect(testedStep.stepName).toBe('upload-counterclaim-files');
    });

    it('declares uploadDocsPath at counterClaimDocuments', () => {
      expect(testedStep.uploadDocsPath).toEqual([
        'possessionClaimResponse',
        'defendantResponses',
        'counterClaimDocuments',
      ]);
    });

    it('declares a file field that is not required (optional per Figma)', () => {
      expect(testedStep.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'documents',
            type: 'file',
            required: false,
          }),
        ])
      );
    });

    it('has all required translation keys', () => {
      expect(testedStep.translationKeys).toEqual(
        expect.objectContaining({
          pageTitle: 'pageTitle',
          caption: 'caption',
          heading: 'heading',
          uploadButton: 'uploadButton',
          filesAddedHeading: 'filesAddedHeading',
          deleteButton: 'deleteButton',
        })
      );
    });

    it('does not have beforeRedirect - documents saved on upload/delete via documentProxy', () => {
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

    it('returns empty object when no documents exist', () => {
      expect(testedStep.getInitialFormData(makeReq(undefined))).toEqual({});
    });

    it('returns empty object when documents array is empty', () => {
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
      const req = { originalUrl: '/case/123/respond-to-claim/upload-counterclaim-files?lang=cy' };

      testedStep.extendGetContent(req, formContent);

      expect(formContent.fields[0].component).toEqual({
        uploadUrl: '/case/123/respond-to-claim/upload-counterclaim-files/upload',
        deleteUrl: '/case/123/respond-to-claim/upload-counterclaim-files/delete',
      });
    });
  });
});
