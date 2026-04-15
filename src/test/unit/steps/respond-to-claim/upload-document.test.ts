jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

jest.mock('../../../../main/steps/utils/populateResponseToClaimPayloadmap', () => ({
  buildCcdCaseForPossessionClaimResponse: jest.fn(),
}));

import { step } from '../../../../main/steps/respond-to-claim/upload-document';
import { buildCcdCaseForPossessionClaimResponse } from '../../../../main/steps/utils/populateResponseToClaimPayloadmap';

type UploadDocumentStep = {
  getInitialFormData: (req: Record<string, unknown>) => Record<string, unknown>;
  extendGetContent: (req: Record<string, unknown>, formContent: Record<string, unknown>) => Record<string, unknown>;
  beforeRedirect: (req: Record<string, unknown>) => Promise<void>;
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

    it('maps CCD documents to CdamDocument format', () => {
      const docs = [
        {
          value: {
            document_url: 'http://dm-store/documents/abc-123',
            document_binary_url: 'http://dm-store/documents/abc-123/binary',
            document_filename: 'evidence.pdf',
          },
        },
      ];

      const result = testedStep.getInitialFormData(makeReq(docs));

      expect(result).toEqual({
        documents: [
          {
            document_url: 'http://dm-store/documents/abc-123',
            document_binary_url: 'http://dm-store/documents/abc-123/binary',
            document_filename: 'evidence.pdf',
          },
        ],
      });
    });

    it('parses category_id JSON for content_type and size', () => {
      const docs = [
        {
          value: {
            document_url: 'http://dm-store/documents/abc-123',
            document_binary_url: 'http://dm-store/documents/abc-123/binary',
            document_filename: 'photo.jpg',
            category_id: '{"mimeType":"image/jpeg","size":976397}',
          },
        },
      ];

      const result = testedStep.getInitialFormData(makeReq(docs));

      expect(result.documents).toEqual([
        expect.objectContaining({
          content_type: 'image/jpeg',
          size: 976397,
        }),
      ]);
    });

    it('handles invalid category_id JSON gracefully', () => {
      const docs = [
        {
          value: {
            document_url: 'http://dm-store/documents/abc-123',
            document_binary_url: 'http://dm-store/documents/abc-123/binary',
            document_filename: 'doc.pdf',
            category_id: 'not-json',
          },
        },
      ];

      const result = testedStep.getInitialFormData(makeReq(docs));

      expect(result.documents).toEqual([
        expect.objectContaining({
          document_filename: 'doc.pdf',
        }),
      ]);
      expect((result.documents as Record<string, unknown>[])[0]).not.toHaveProperty('content_type');
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

  describe('beforeRedirect', () => {
    it('saves uploaded documents to CCD via buildCcdCaseForPossessionClaimResponse', async () => {
      const req = {
        body: {
          'uploadedDocuments[]': [
            JSON.stringify({
              document_url: 'http://dm-store/documents/abc-123',
              document_binary_url: 'http://dm-store/documents/abc-123/binary',
              document_filename: 'evidence.pdf',
              content_type: 'application/pdf',
              size: 1024,
            }),
          ],
        },
      };

      await testedStep.beforeRedirect(req);

      expect(buildCcdCaseForPossessionClaimResponse).toHaveBeenCalledWith(
        req,
        expect.objectContaining({
          defendantResponses: {
            uploadedDocuments: [
              {
                value: expect.objectContaining({
                  document_url: 'http://dm-store/documents/abc-123',
                  document_binary_url: 'http://dm-store/documents/abc-123/binary',
                  document_filename: 'evidence.pdf',
                  category_id: '{"mimeType":"application/pdf","size":1024}',
                }),
              },
            ],
          },
        })
      );
    });

    it('saves empty array when no documents submitted', async () => {
      const req = { body: {} };

      await testedStep.beforeRedirect(req);

      expect(buildCcdCaseForPossessionClaimResponse).toHaveBeenCalledWith(req, {
        defendantResponses: {
          uploadedDocuments: [],
        },
      });
    });

    it('skips malformed JSON entries in hidden inputs', async () => {
      const req = {
        body: {
          'uploadedDocuments[]': ['not-valid-json', JSON.stringify({ document_url: 'only-url' })],
        },
      };

      await testedStep.beforeRedirect(req);

      expect(buildCcdCaseForPossessionClaimResponse).toHaveBeenCalledWith(req, {
        defendantResponses: {
          uploadedDocuments: [],
        },
      });
    });

    it('handles single document (non-array hidden input)', async () => {
      const req = {
        body: {
          'uploadedDocuments[]': JSON.stringify({
            document_url: 'http://dm-store/documents/abc-123',
            document_binary_url: 'http://dm-store/documents/abc-123/binary',
            document_filename: 'single.pdf',
          }),
        },
      };

      await testedStep.beforeRedirect(req);

      expect(buildCcdCaseForPossessionClaimResponse).toHaveBeenCalledWith(
        req,
        expect.objectContaining({
          defendantResponses: {
            uploadedDocuments: [
              {
                value: expect.objectContaining({
                  document_filename: 'single.pdf',
                }),
              },
            ],
          },
        })
      );
    });

    it('encodes category_id only when content_type or size exists', async () => {
      const req = {
        body: {
          'uploadedDocuments[]': JSON.stringify({
            document_url: 'http://dm-store/documents/abc-123',
            document_binary_url: 'http://dm-store/documents/abc-123/binary',
            document_filename: 'no-meta.pdf',
          }),
        },
      };

      await testedStep.beforeRedirect(req);

      const call = (buildCcdCaseForPossessionClaimResponse as jest.Mock).mock.calls[0][1];
      const doc = call.defendantResponses.uploadedDocuments[0].value;

      expect(doc).not.toHaveProperty('category_id');
    });
  });
});
