import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import type { CcdCollectionItem, CcdDocumentReference } from '@interfaces/ccdCase.interface';
import type { PossessionClaimResponse } from '@interfaces/ccdCaseData.model';
import type { CdamDocument } from '@interfaces/documentUpload.interface';
import type { StepDefinition } from '@interfaces/stepFormData.interface';
import { createFormStep, getTranslationFunction } from '@modules/steps';
import {
  ACCEPT_ATTRIBUTE_EXTENSIONS,
  UPLOAD_MAX_FILE_SIZE_MB,
  parseUploadedDocuments,
  toCcdDocumentCollection,
} from '@utils/documentUploadValidation';

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

    const existingDocs =
      req.res?.locals?.validatedCase?.possessionClaimResponse?.defendantResponses?.defendantUploadedDocuments;

    const uploadedFiles: CdamDocument[] = existingDocs
      ? existingDocs.map((item: CcdCollectionItem<CcdDocumentReference>) => {
          const v = item.value;
          const doc: CdamDocument = {
            document_url: v.document_url,
            document_binary_url: v.document_binary_url,
            document_filename: v.document_filename,
          };
          if (v.content_type !== undefined && v.content_type !== null) {
            doc.content_type = v.content_type;
          }
          if (v.size !== undefined && v.size !== null) {
            doc.size = v.size;
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
        defendantUploadedDocuments: toCcdDocumentCollection(documents),
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
});
