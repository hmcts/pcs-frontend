import type { Request } from 'express';

import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

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
  // Shown when the citizen cancelled in the microsite (payload action = 'cancel')
  extendGetContent: (req: Request) => {
    const caseReference = req.res?.locals.validatedCase?.id;
    return { languageUsedUrl: `/case/${caseReference}/respond-to-claim/language-used?nav=1` };
  },
});
