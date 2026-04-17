import type { Request } from 'express';

import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CcdCollectionItem, CcdDefendantDocument } from '@services/ccdCase.interface';
import type { PossessionClaimResponse } from '@services/ccdCaseData.model';
import type { CdamDocument } from '@services/documentUpload.interface';
import { ACCEPT_ATTRIBUTE_EXTENSIONS, UPLOAD_MAX_FILE_SIZE_MB } from '@utils/documentUploadValidation';

function mapCcdDocToCdamDoc(v: CcdDefendantDocument): CdamDocument {
  const doc: CdamDocument = {
    document_url: v.document.document_url,
    document_binary_url: v.document.document_binary_url,
    document_filename: v.document.document_filename,
  };
  if (v.contentType) {
    doc.content_type = v.contentType;
  }
  if (typeof v.size === 'number') {
    doc.size = v.size;
  }
  return doc;
}

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

function toCcdDocumentCollection(docs: CdamDocument[]): CcdCollectionItem<CcdDefendantDocument>[] {
  return docs.map(doc => {
    const value: CcdDefendantDocument = {
      document: {
        document_url: doc.document_url,
        document_binary_url: doc.document_binary_url,
        document_filename: doc.document_filename,
      },
      contentType: doc.content_type,
      size: doc.size,
    };
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
      labelClasses: 'govuk-label--m',
      translationKey: {
        label: 'uploadLabel',
      },
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
  getInitialFormData: (req: Request) => {
    const existingDocs = req.res?.locals?.validatedCase?.possessionClaimResponse?.defendantResponses?.uploadedDocuments;
    if (!existingDocs?.length) {
      return {};
    }
    return {
      documents: existingDocs.map((item: CcdCollectionItem<CcdDefendantDocument>) => mapCcdDocToCdamDoc(item.value)),
    };
  },
  extendGetContent: (req, formContent) => {
    const basePath = req.originalUrl.split('?')[0];
    const fileField = formContent.fields?.find((f: { componentType?: string }) => f.componentType === 'fileUpload');
    if (fileField?.component) {
      fileField.component.uploadUrl = `${basePath}/upload`;
      fileField.component.deleteUrl = `${basePath}/delete`;
    }
    return {};
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
