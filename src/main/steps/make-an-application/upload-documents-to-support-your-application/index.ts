import { flowConfig } from '../flow.config';

import { createFormStep, getFormData } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { ACCEPT_ATTRIBUTE_EXTENSIONS, UPLOAD_MAX_FILE_SIZE_MB } from '@utils/documentUploadValidation';

export const step: StepDefinition = createFormStep({
  stepName: 'upload-documents-to-support-your-application',
  journeyFolder: 'makeAnApplication',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/uploadDocuments.njk`,
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
    beforeUploadText: 'beforeUploadText',
    fileTypesText: 'fileTypesText',
    uploadSubheading: 'uploadSubheading',
    uploadLabel: 'uploadLabel',
    filesAddedHeading: 'filesAddedHeading',
    uploadButton: 'uploadButton',
    deleteButton: 'deleteButton',
  },
  getInitialFormData: req => {
    const existingFormData = getFormData(req, 'upload-documents-to-support-your-application');
    return {
      documents: (existingFormData.documents as unknown[]) || [],
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
});
