import { radioQuestion } from '../../fieldBuilders';
import {
  PROPERTY_COUNTRY_URL,
  WALES_CLAIMANT_TYPE_URL,
  WHO_IS_CLAIMING_URL,
  createClaimFromStartAnswers,
} from '../createClaim';
import { propertyEligibilityRedirect } from '../propertyEligibility';
import { createStartStep } from '../startStep';

import { getFormData } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createStartStep({
  stepName: 'property-country',
  stepDir: __dirname,
  fields: [radioQuestion('legislativeCountry', ['England', 'Wales'])],
  invalidates: ['wales-claimant-type'],
  beforeRedirect: async req => {
    const country = req.body?.legislativeCountry;
    if (country !== 'England' && country !== 'Wales') {
      return;
    }
    const redirect = await propertyEligibilityRedirect(req, country);
    if (redirect && redirect !== PROPERTY_COUNTRY_URL && redirect !== WALES_CLAIMANT_TYPE_URL) {
      return req.res?.redirect(303, redirect);
    }
    if (country === 'Wales') {
      return req.res?.redirect(303, WALES_CLAIMANT_TYPE_URL);
    }
    const claimingForThemselves = getFormData(req, 'who-is-claiming').whoIsClaiming === 'MYSELF';
    req.res?.redirect(303, claimingForThemselves ? await createClaimFromStartAnswers(req) : WHO_IS_CLAIMING_URL);
  },
});
