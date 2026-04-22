import type { Request } from 'express';

import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CcdCollectionItem, CcdUploadedDocument } from '@services/ccdCase.interface';
import { ACCEPT_ATTRIBUTE_EXTENSIONS, UPLOAD_MAX_FILE_SIZE_MB } from '@utils/documentUploadValidation';

interface DisplayDocument {
  index: number;
  document_filename: string;
  content_type?: string;
  size?: number;
}

function toDisplayDocuments(docs: CcdCollectionItem<CcdUploadedDocument>[]): DisplayDocument[] {
  return docs.map((item, index) => ({
    index,
    document_filename: item.value.document.document_filename,
    content_type: item.value.contentType,
    size: item.value.size,
  }));
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
      labelClasses: 'govuk-label--s',
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
    const existingDocs =
      req.res?.locals?.validatedCase?.possessionClaimResponse?.defendantResponses?.defendantDocuments;
    if (!existingDocs?.length) {
      return {};
    }
    return {
      documents: toDisplayDocuments(existingDocs),
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
  // No beforeRedirect needed - documents are saved to CCD on upload/delete
});
