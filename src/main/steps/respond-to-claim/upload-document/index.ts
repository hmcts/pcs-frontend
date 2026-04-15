import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import type { CcdCollectionItem, CcdDocumentReference } from '@interfaces/ccdCase.interface';
import type { PossessionClaimResponse } from '@interfaces/ccdCaseData.model';
import type { CdamDocument } from '@interfaces/documentUpload.interface';
import type { StepDefinition } from '@interfaces/stepFormData.interface';
import { createFormStep, getTranslationFunction } from '@modules/steps';
import { ACCEPT_ATTRIBUTE_EXTENSIONS, UPLOAD_MAX_FILE_SIZE_MB } from '@utils/documentUploadValidation';

function parseUploadedDocuments(body: Record<string, unknown>): CdamDocument[] {
  const raw = body['uploadedDocuments[]'];
  if (!raw) {
    return [];
  }

  const items = Array.isArray(raw) ? raw : [raw];
  const documents: CdamDocument[] = [];

  for (const item of items) {
    try {
      const parsed = typeof item === 'string' ? JSON.parse(item) : item;
      if (parsed?.document_url && parsed?.document_binary_url && parsed?.document_filename) {
        const doc: CdamDocument = {
          document_url: parsed.document_url,
          document_binary_url: parsed.document_binary_url,
          document_filename: parsed.document_filename,
        };
        if (typeof parsed.content_type === 'string' && parsed.content_type) {
          doc.content_type = parsed.content_type;
        }
        const sizeNum = typeof parsed.size === 'number' ? parsed.size : Number(parsed.size);
        if (!Number.isNaN(sizeNum) && sizeNum >= 0) {
          doc.size = sizeNum;
        }
        documents.push(doc);
      }
    } catch {
      // Skip malformed entries
    }
  }

  return documents;
}

function toCcdDocumentCollection(docs: CdamDocument[]): CcdCollectionItem<CcdDocumentReference>[] {
  return docs.map(doc => {
    const value: CcdDocumentReference = {
      document_url: doc.document_url,
      document_binary_url: doc.document_binary_url,
      document_filename: doc.document_filename,
    };
    if (doc.content_type || doc.size) {
      value.category_id = JSON.stringify({
        mimeType: doc.content_type || '',
        size: doc.size || 0,
      });
    }
    return { value };
  });
}

export const step: StepDefinition = createFormStep({
  stepName: 'upload-document',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/uploadDocument.njk`,
  fields: [
    {
      name: 'documents',
      type: 'file',
      required: false,
      accept: ACCEPT_ATTRIBUTE_EXTENSIONS,
      maxFileSize: UPLOAD_MAX_FILE_SIZE_MB,
    },
  ],
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
    guidanceText: 'guidanceText',
    beforeUploadHeading: 'beforeUploadHeading',
    beforeUploadText: 'beforeUploadText',
    uploadLabel: 'uploadLabel',
    filesAddedHeading: 'filesAddedHeading',
    uploadButton: 'uploadButton',
    deleteButton: 'deleteButton',
  },
  extendGetContent: async (req, formContent) => {
    const t = getTranslationFunction(req, 'upload-document', ['common']);

    const existingDocs = req.res?.locals?.validatedCase?.possessionClaimResponse?.defendantResponses?.uploadedDocuments;

    const uploadedFiles: CdamDocument[] = existingDocs
      ? existingDocs.map((item: CcdCollectionItem<CcdDocumentReference>) => {
          const v = item.value;
          const doc: CdamDocument = {
            document_url: v.document_url,
            document_binary_url: v.document_binary_url,
            document_filename: v.document_filename,
          };
          if (v.category_id) {
            try {
              const meta = JSON.parse(v.category_id);
              if (meta.mimeType) {
                doc.content_type = meta.mimeType;
              }
              if (typeof meta.size === 'number') {
                doc.size = meta.size;
              }
            } catch {
              // category_id is not JSON metadata -- ignore
            }
          }
          return doc;
        })
      : [];

    return {
      ...formContent,
      uploadUrl: `${req.originalUrl}/upload`,
      deleteUrl: `${req.originalUrl}/delete`,
      uploadedFiles,
      acceptAttribute: ACCEPT_ATTRIBUTE_EXTENSIONS,
      maxFileSizeMb: UPLOAD_MAX_FILE_SIZE_MB,
      wrongFileTypeError: t('common:errors.documentUpload.wrongFileTypeDocStore'),
      fileTooLargeError: t('common:errors.documentUpload.fileTooLargeDocStore', {
        maxSize: String(UPLOAD_MAX_FILE_SIZE_MB),
      }),
      deleteFailedError: t('common:errors.documentUpload.fileDeleteFailed'),
    };
  },
  beforeRedirect: async req => {
    const documents = parseUploadedDocuments(req.body);

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        uploadedDocuments: toCcdDocumentCollection(documents),
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
});
