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

import { step } from '../../../../main/steps/respond-to-claim/upload-document';

type UploadDocumentStep = {
  getInitialFormData: (req: Record<string, unknown>) => Promise<Record<string, unknown>>;
  beforeRedirect?: (req: Record<string, unknown>) => Promise<void>;
  fields: { name: string; type: string; required: boolean }[];
  stepName: string;
  translationKeys: Record<string, string>;
  documentStorage: { read: jest.Mock; readFresh: jest.Mock; save: jest.Mock };
};

describe('upload-document step', () => {
  const testedStep = step as unknown as UploadDocumentStep;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('step config', () => {
    it('has correct step name', () => {
      expect(testedStep.stepName).toBe('upload-document');
    });

    it('declares a file field that is not required', () => {
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
          heading: 'heading',
          uploadButton: 'uploadButton',
          filesAddedHeading: 'filesAddedHeading',
          deleteButton: 'deleteButton',
        })
      );
    });

    it('does not have beforeRedirect - documents saved on upload/delete', () => {
      expect(testedStep.beforeRedirect).toBeUndefined();
    });

    it('carries a documentStorage adapter with read, readFresh, save', () => {
      expect(typeof testedStep.documentStorage?.read).toBe('function');
      expect(typeof testedStep.documentStorage?.readFresh).toBe('function');
      expect(typeof testedStep.documentStorage?.save).toBe('function');
    });
  });

  describe('getInitialFormData', () => {
    const makeReq = (defendantDocuments?: unknown[]) => ({
      session: { user: { accessToken: 'token' } },
      params: { caseReference: '123' },
      res: {
        locals: {
          validatedCase: {
            data: {
              possessionClaimResponse: {
                defendantResponses: { defendantDocuments },
              },
            },
          },
        },
      },
    });

    it('returns empty documents when no documents exist', async () => {
      const result = await testedStep.getInitialFormData(makeReq(undefined));
      expect(result).toEqual({ documents: [] });
    });

    it('returns empty documents when documents array is empty', async () => {
      const result = await testedStep.getInitialFormData(makeReq([]));
      expect(result).toEqual({ documents: [] });
    });

    it('returns display-only data with index and filename, no CDAM URLs', async () => {
      const docs = [
        {
          id: 'doc-1',
          value: {
            document: {
              document_url: 'http://dm-store/documents/abc-123',
              document_binary_url: 'http://dm-store/documents/abc-123/binary',
              document_filename: 'evidence.pdf',
            },
            contentType: 'application/pdf',
            sizeInBytes: 1024,
          },
        },
      ];

      const result = await testedStep.getInitialFormData(makeReq(docs));
      const documents = result.documents as Record<string, unknown>[];

      expect(documents).toHaveLength(1);
      expect(documents[0]).toEqual({
        index: 0,
        id: 'doc-1',
        document_filename: 'evidence.pdf',
        content_type: 'application/pdf',
        size: 1024,
      });
      expect(documents[0]).not.toHaveProperty('document_url');
      expect(documents[0]).not.toHaveProperty('document_binary_url');
    });

    it('assigns sequential indexes to multiple documents', async () => {
      const docs = [
        { value: { document: { document_url: 'x', document_binary_url: 'x/b', document_filename: 'first.pdf' } } },
        { value: { document: { document_url: 'y', document_binary_url: 'y/b', document_filename: 'second.pdf' } } },
      ];

      const result = await testedStep.getInitialFormData(makeReq(docs));
      const documents = result.documents as Record<string, unknown>[];

      expect(documents[0].index).toBe(0);
      expect(documents[1].index).toBe(1);
    });

    it('handles missing validatedCase gracefully', async () => {
      const result = await testedStep.getInitialFormData({ res: { locals: {} }, session: {}, params: {} });
      expect(result).toEqual({ documents: [] });
    });
  });
});
