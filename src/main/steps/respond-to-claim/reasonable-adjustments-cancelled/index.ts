import type { Request } from 'express';

import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { redirectToPcq } from '@services/pcq/redirectToPcq';

// Shown when the citizen cancelled in the microsite (payload action = 'cancel')

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'reasonable-adjustments-cancelled',
  stepDir: __dirname,
  fields: [],
  customTemplate: `${__dirname}/reasonableAdjustmentsCancelled.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    continueButton: 'continueButton',
  },
  // Cancelling Your Support leads to PCQ
  beforeRedirect: async (req: Request) => {
    await redirectToPcq(req);
  },
  // "Continue" returns the citizen to their response journey at language-used.
  resolveRedirectAfterPost: async req => {
    const caseReference = req.res?.locals.validatedCase?.id;
    return caseReference ? `/case/${caseReference}/respond-to-claim/language-used?nav=1` : undefined;
  },
});
