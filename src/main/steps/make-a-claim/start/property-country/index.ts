import { radioQuestion } from '../../fieldBuilders';
import { PROPERTY_COUNTRY_URL, WHO_IS_CLAIMING_URL, createClaimFromStartAnswers } from '../createClaim';
import { propertyEligibilityRedirect } from '../propertyEligibility';
import { createStartStep } from '../startStep';

import { getFormData } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createStartStep({
  stepName: 'property-country',
  stepDir: __dirname,
  fields: [radioQuestion('legislativeCountry', ['England', 'Wales'])],
  beforeRedirect: async req => {
    if (req.body?.legislativeCountry !== 'England') {
      return;
    }
    const redirect = await propertyEligibilityRedirect(req, 'England');
    if (redirect && redirect !== PROPERTY_COUNTRY_URL) {
      return req.res?.redirect(303, redirect);
    }
    const claimingForThemselves = getFormData(req, 'who-is-claiming').whoIsClaiming === 'MYSELF';
    req.res?.redirect(303, claimingForThemselves ? await createClaimFromStartAnswers(req) : WHO_IS_CLAIMING_URL);
  },
});
