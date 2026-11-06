import { radioQuestion } from '../../fieldBuilders';
import { createClaimFromStartAnswers } from '../createClaim';
import { createStartStep } from '../startStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createStartStep({
  stepName: 'property-country',
  stepDir: __dirname,
  fields: [radioQuestion('legislativeCountry', ['England', 'Wales'])],
  beforeRedirect: async req => {
    if (req.body?.legislativeCountry !== 'England') {
      return;
    }
    req.res?.redirect(303, await createClaimFromStartAnswers(req));
  },
});
