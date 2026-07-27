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
  // Shown when the citizen cancelled in the microsite (payload action = 'cancel') — nothing was
  // sent to the court, so this is deliberately barer than the confirmation page (heading + a
  // "Continue" button, no "what happens next"). The button continues the response journey at
  // language-used; nav=1 marks it as internal navigation so the access guard allows direct entry to
  // that mid-section step (RA triage is the first visible step of checkYourAnswersAndSubmit).
  extendGetContent: (req: Request) => {
    const caseReference = req.res?.locals.validatedCase?.id;
    return { languageUsedUrl: `/case/${caseReference}/respond-to-claim/language-used?nav=1` };
  },
});
