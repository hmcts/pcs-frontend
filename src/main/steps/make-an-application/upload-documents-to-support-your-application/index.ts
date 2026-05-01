import type { Request } from 'express';

import { flowConfig } from '../flow.config';

import { sessionDocs, toDisplayDocuments } from '@modules/documents/storage';
import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { ACCEPT_ATTRIBUTE_EXTENSIONS, UPLOAD_MAX_FILE_SIZE_MB } from '@utils/documentUploadValidation';

const STEP_NAME = 'upload-documents-to-support-your-application';
const storage = sessionDocs({ stepName: STEP_NAME });

function getDefendantNumberFromCaseData(req: Request): number {
  const caseData = req.res?.locals?.validatedCase?.data as Record<string, unknown> | undefined;
  const rawDefendantNumber = caseData?.defendantNumber;

  if (typeof rawDefendantNumber === 'number' && Number.isInteger(rawDefendantNumber) && rawDefendantNumber > 0) {
    return rawDefendantNumber;
  }

  if (typeof rawDefendantNumber === 'string') {
    const parsed = Number(rawDefendantNumber);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 1;
}

function addGenAppFilenameSuffix(filename: string, defendantNumber: number): string {
  const suffix = ` (GA1) - Defendant ${defendantNumber}`;
  const lastDotIndex = filename.lastIndexOf('.');
  const hasExtension = lastDotIndex > 0;
  const baseName = hasExtension ? filename.slice(0, lastDotIndex) : filename;
  const extension = hasExtension ? filename.slice(lastDotIndex) : '';

  if (baseName.toLowerCase().endsWith(suffix.toLowerCase())) {
    return filename;
  }

  return `${baseName}${suffix}${extension}`;
}

export const step: StepDefinition = createFormStep({
  stepName: STEP_NAME,
  journeyFolder: 'makeAnApplication',
  documentStorage: storage,
  uploadFilenameTransform: (req, originalName) =>
    addGenAppFilenameSuffix(originalName, getDefendantNumberFromCaseData(req)),
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
  getInitialFormData: async req => ({ documents: toDisplayDocuments(await storage.read(req)) }),
});
