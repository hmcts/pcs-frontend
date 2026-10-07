import type { Request } from 'express';

import { createRespondToClaimFormStep } from '../formStep';
import { getYourSupportTriageUrl } from '../yourSupportSection';

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
  // Context-aware error page shown when launching Your Support fails. "Try again" re-enters the triage
  // with the origin the citizen came from, so a retry still returns them to the right place.
  extendGetContent: (req: Request) => ({ triageUrl: getYourSupportTriageUrl(req) }),
});
