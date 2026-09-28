import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { step as checkYourAnswers } from './check-your-answers';
import { step as confirmation } from './confirmation';
import { step as uploadDocuments } from './upload-documents';

export const stepRegistry = {
  'upload-documents': uploadDocuments,
  'check-your-answers': checkYourAnswers,
  'confirmation': confirmation
} satisfies Record<string, StepDefinition>;

export type StepName = keyof typeof stepRegistry;
