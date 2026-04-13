import type { StepDefinition } from '../../interfaces/stepFormData.interface';

import { step as checkYourAnswers } from './check-your-answers';
import { step as chooseAnApplication } from './choose-an-application';

export const stepRegistry: Record<string, StepDefinition> = {
  'choose-an-application': chooseAnApplication,
  'check-your-answers': checkYourAnswers,
};
