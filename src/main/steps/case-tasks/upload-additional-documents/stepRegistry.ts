import { step as confirmIfTheseDocumentsRelateToAnApplication } from './confirm-if-these-documents-relate-to-an-application';
import { step as start } from './start';
import { step as uploadYourDocuments } from './upload-your-documents';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const stepRegistry: Record<string, StepDefinition> = {
  start,
  'confirm-if-these-documents-relate-to-an-application': confirmIfTheseDocumentsRelateToAnApplication,
  'upload-your-documents': uploadYourDocuments,
};
