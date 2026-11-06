import { radioQuestion } from '../../fieldBuilders';
import { createClaimFromStartAnswers } from '../createClaim';
import { createStartStep } from '../startStep';

import { clearFormData } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createStartStep({
  stepName: 'who-is-claiming',
  stepDir: __dirname,
  fields: [radioQuestion('whoIsClaiming', ['MYSELF', 'SOLICITOR', 'LITIGATION_FRIEND', 'AGENT'])],
  beforeRedirect: async req => {
    if (req.body?.whoIsClaiming !== 'MYSELF') {
      return;
    }
    const next = await createClaimFromStartAnswers(req);
    if (!next.endsWith('/property-country')) {
      clearFormData(req);
    }
    req.res?.redirect(303, next);
  },
});
