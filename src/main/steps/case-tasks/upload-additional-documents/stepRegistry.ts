import { step as confirmIfTheseDocumentsRelateToAnApplication } from './confirm-if-these-documents-relate-to-an-application';
import { step as startEvidenceUpload } from './start-evidence-upload';
import { step as uploadYourDocuments } from './upload-your-documents';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const stepRegistry: Record<string, StepDefinition> = {
  'start-evidence-upload': startEvidenceUpload,
  'confirm-if-these-documents-relate-to-an-application': confirmIfTheseDocumentsRelateToAnApplication,
  'upload-your-documents': uploadYourDocuments,
};
