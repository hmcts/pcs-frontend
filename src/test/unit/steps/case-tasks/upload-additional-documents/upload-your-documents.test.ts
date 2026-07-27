jest.mock('../../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

import type { Request } from 'express';

import type { DisplayDocument, DocumentStorage } from '../../../../../main/modules/documents/storage';
import { step } from '../../../../../main/steps/case-tasks/upload-additional-documents/upload-your-documents';

import type { CcdCollectionItem, CcdUploadedDocument } from '@services/ccdCase.interface';

const STEP_NAME = 'upload-your-documents';

type UploadYourDocumentsStep = {
  getInitialFormData: (req: Request) => Promise<{ documents: DisplayDocument[] }>;
  beforeRedirect?: (req: Request) => Promise<void>;
  fields: { name: string; type: string; required: boolean }[];
  stepName: string;
  translationKeys: Record<string, string>;
  customTemplate: string;
  documentStorage: DocumentStorage;
};

function asUploadYourDocumentsStep(value: unknown): UploadYourDocumentsStep {
  return value as UploadYourDocumentsStep;
}

const doc1: CcdCollectionItem<CcdUploadedDocument> = {
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
};

const doc2: CcdCollectionItem<CcdUploadedDocument> = {
  id: 'doc-2',
  value: {
    document: {
      document_url: 'http://dm-store/documents/def-456',
      document_binary_url: 'http://dm-store/documents/def-456/binary',
      document_filename: 'second.pdf',
    },
    contentType: 'application/pdf',
    sizeInBytes: 2048,
  },
};

const CASE_REF = '1234567890123456';

function makeReq(docs?: CcdCollectionItem<CcdUploadedDocument>[]): Request {
  return {
    params: { caseReference: CASE_REF },
    session: {
      uploadedDocs: docs !== undefined ? { [CASE_REF]: { [STEP_NAME]: docs } } : undefined,
      reload: jest.fn((cb: (err: null) => void) => cb(null)),
      save: jest.fn((cb: (err: null) => void) => cb(null)),
    },
  } as unknown as Request;
}

describe('upload-your-documents step', () => {
  const testedStep = asUploadYourDocumentsStep(step);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('step config', () => {
    it('has correct step name', () => {
      expect(testedStep.stepName).toBe(STEP_NAME);
    });

    it('uses the upload-your-documents template', () => {
      expect(testedStep.customTemplate).toContain('uploadYourDocuments.njk');
    });

    it('declares a required file field', () => {
      expect(testedStep.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'documents',
            type: 'file',
            required: true,
          }),
        ])
      );
    });

    it('has all required translation keys', () => {
      expect(testedStep.translationKeys).toEqual(
        expect.objectContaining({
          pageTitle: 'pageTitle',
          heading: 'heading',
          guidanceText: 'guidanceText',
          beforeUploadText: 'beforeUploadText',
          fileTypesText: 'fileTypesText',
          uploadLabel: 'uploadLabel',
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
    it('returns empty documents when no documents exist in session', async () => {
      const result = await testedStep.getInitialFormData(makeReq());
      expect(result).toEqual({ documents: [] });
    });

    it('returns empty documents when documents array is empty', async () => {
      const result = await testedStep.getInitialFormData(makeReq([]));
      expect(result).toEqual({ documents: [] });
    });

    it('returns display-only data with index and filename, no CDAM URLs', async () => {
      const result = await testedStep.getInitialFormData(makeReq([doc1]));

      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]).toEqual({
        index: 0,
        id: 'doc-1',
        document_filename: 'evidence.pdf',
        content_type: 'application/pdf',
        sizeInBytes: 1024,
      });
      expect(result.documents[0]).not.toHaveProperty('document_url');
      expect(result.documents[0]).not.toHaveProperty('document_binary_url');
    });

    it('assigns sequential indexes to multiple documents', async () => {
      const result = await testedStep.getInitialFormData(makeReq([doc1, doc2]));

      expect(result.documents[0].index).toBe(0);
      expect(result.documents[1].index).toBe(1);
    });
  });
});
