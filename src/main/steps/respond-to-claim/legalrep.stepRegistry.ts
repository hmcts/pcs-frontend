import { step as emailConfirmation } from './email-confirmation';
import { step as resumeResponse } from './resume-response';
import { step as selectDefendant } from './select-defendant';
import { stepRegistry } from './stepRegistry';

import { StepDefinition } from '@modules/steps/stepFormData.interface';

export const legalRepStepRegistry = {
  ...stepRegistry,
  'select-defendant': selectDefendant,
  'resume-response': resumeResponse,
  'email-confirmation': emailConfirmation,
} satisfies Record<string, StepDefinition>;

export type LegalRepRespondToClaimStepName = keyof typeof legalRepStepRegistry;
