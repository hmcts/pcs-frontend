import { radioQuestion } from '../../fieldBuilders';
import { createStartStep } from '../startStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createStartStep({
  stepName: 'claimant-type',
  stepDir: __dirname,
  fields: [radioQuestion('claimantType', ['PRIVATE_LANDLORD', 'SOCIAL_LANDLORD', 'MORTGAGE_LENDER'])],
});
