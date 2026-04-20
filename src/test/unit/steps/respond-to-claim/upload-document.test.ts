jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

import { step } from '../../../../main/steps/respond-to-claim/upload-document';

type UploadDocumentStep = {
  getInitialFormData: (req: Record<string, unknown>) => Record<string, unknown>;
  extendGetContent: (req: Record<string, unknown>, formContent: Record<string, unknown>) => Record<string, unknown>;
  beforeRedirect?: (req: Record<string, unknown>) => Promise<void>;
  fields: { name: string; type: string; required: boolean }[];
  stepName: string;
  translationKeys: Record<string, string>;
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
  });

  describe('getInitialFormData', () => {
    const makeReq = (uploadedDocuments?: unknown[]) => ({
      res: {
        locals: {
          validatedCase: {
            possessionClaimResponse: {
              defendantResponses: { uploadedDocuments },
            },
          },
        },
      },
    });

    it('returns empty object when no documents exist', () => {
      const result = testedStep.getInitialFormData(makeReq(undefined));
      expect(result).toEqual({});
    });

    it('returns empty object when documents array is empty', () => {
      const result = testedStep.getInitialFormData(makeReq([]));
      expect(result).toEqual({});
    });

    it('returns display-only data with index and filename, no CDAM URLs', () => {
      const docs = [
        {
          value: {
            document: {
              document_url: 'http://dm-store/documents/abc-123',
              document_binary_url: 'http://dm-store/documents/abc-123/binary',
              document_filename: 'evidence.pdf',
            },
            contentType: 'application/pdf',
            size: 1024,
          },
        },
      ];

      const result = testedStep.getInitialFormData(makeReq(docs));
      const documents = result.documents as Record<string, unknown>[];

      expect(documents).toHaveLength(1);
      expect(documents[0]).toEqual({
        index: 0,
        document_filename: 'evidence.pdf',
        content_type: 'application/pdf',
        size: 1024,
      });
      // No CDAM URLs exposed
      expect(documents[0]).not.toHaveProperty('document_url');
      expect(documents[0]).not.toHaveProperty('document_binary_url');
    });

    it('assigns sequential indexes to multiple documents', () => {
      const docs = [
        {
          value: {
            document: {
              document_url: 'http://dm-store/documents/aaa',
              document_binary_url: 'http://dm-store/documents/aaa/binary',
              document_filename: 'first.pdf',
            },
          },
        },
        {
          value: {
            document: {
              document_url: 'http://dm-store/documents/bbb',
              document_binary_url: 'http://dm-store/documents/bbb/binary',
              document_filename: 'second.pdf',
            },
          },
        },
      ];

      const result = testedStep.getInitialFormData(makeReq(docs));
      const documents = result.documents as Record<string, unknown>[];

      expect(documents[0].index).toBe(0);
      expect(documents[1].index).toBe(1);
    });

    it('handles missing contentType and size gracefully', () => {
      const docs = [
        {
          value: {
            document: {
              document_url: 'http://dm-store/documents/abc-123',
              document_binary_url: 'http://dm-store/documents/abc-123/binary',
              document_filename: 'doc.pdf',
            },
          },
        },
      ];

      const result = testedStep.getInitialFormData(makeReq(docs));
      const documents = result.documents as Record<string, unknown>[];

      expect(documents[0].document_filename).toBe('doc.pdf');
      expect(documents[0].content_type).toBeUndefined();
      expect(documents[0].size).toBeUndefined();
    });

    it('handles missing validatedCase gracefully', () => {
      const result = testedStep.getInitialFormData({ res: { locals: {} } });
      expect(result).toEqual({});
    });
  });

  describe('extendGetContent', () => {
    it('injects upload and delete URLs from request URL', () => {
      const fileField = { componentType: 'fileUpload', component: {} as Record<string, unknown> };
      const formContent = { fields: [fileField] };
      const req = { originalUrl: '/case/123/respond-to-claim/upload-document?lang=en' };

      testedStep.extendGetContent(req, formContent);

      expect(fileField.component.uploadUrl).toBe('/case/123/respond-to-claim/upload-document/upload');
      expect(fileField.component.deleteUrl).toBe('/case/123/respond-to-claim/upload-document/delete');
    });

    it('strips query string from URL before appending', () => {
      const fileField = { componentType: 'fileUpload', component: {} as Record<string, unknown> };
      const formContent = { fields: [fileField] };
      const req = { originalUrl: '/case/123/respond-to-claim/upload-document?lang=cy&foo=bar' };

      testedStep.extendGetContent(req, formContent);

      expect(fileField.component.uploadUrl).not.toContain('?');
      expect(fileField.component.deleteUrl).not.toContain('?');
    });

    it('does nothing when no fileUpload field exists', () => {
      const formContent = { fields: [{ componentType: 'input', component: {} }] };
      const req = { originalUrl: '/some/path' };

      const result = testedStep.extendGetContent(req, formContent);

      expect(result).toEqual({});
    });
  });
});
