import type { Request } from 'express';

import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'reasonable-adjustments-error',
  stepDir: __dirname,
  fields: [],
  customTemplate: `${__dirname}/reasonableAdjustmentsError.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    paragraph: 'paragraph',
    tryAgainButton: 'tryAgainButton',
  },
  // Context-aware error page shown when launching Your Support fails. We expose the triage URL so
  // the "Try again" button can send the citizen back to re-attempt — unlike the shared error page,
  // which has no way back into this journey (which is why the team asked for a dedicated screen).
  extendGetContent: (req: Request) => {
    const caseReference = req.res?.locals.validatedCase?.id;
    return { triageUrl: `/case/${caseReference}/respond-to-claim/reasonable-adjustments-triage` };
  },
});
