import type { StepDefinition } from '../../interfaces/stepFormData.interface';

import { step as defendantNameConfirmation } from './defendant-name-confirmation';
import { step as freeLegalAdvice } from './free-legal-advice';
import { step as startNow } from './start-now';

export const stepRegistry: Record<string, StepDefinition> = {
  'professional-start-now': startNow,
  'professional-free-legal-advice': freeLegalAdvice,
  'professional-defendant-name-confirmation': defendantNameConfirmation,
};
