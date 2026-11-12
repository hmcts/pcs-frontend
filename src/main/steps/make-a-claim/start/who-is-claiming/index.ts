import { radioQuestion } from '../../fieldBuilders';
import { createClaimFromStartAnswers } from '../createClaim';
import { createStartStep } from '../startStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createStartStep({
  stepName: 'who-is-claiming',
  stepDir: __dirname,
  fields: [radioQuestion('whoIsClaiming', ['MYSELF', 'SOLICITOR', 'LITIGATION_FRIEND', 'AGENT'])],
  beforeRedirect: async req => {
    if (req.body?.whoIsClaiming !== 'MYSELF') {
      return;
    }
    req.res?.redirect(303, await createClaimFromStartAnswers(req));
  },
});
