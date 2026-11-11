import type { Request } from 'express';

import { createRespondToClaimFormStep } from '../formStep';
import { getYourSupportReturnUrl } from '../yourSupportSection';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

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
  // Shown when the citizen cancelled / made no changes in the microsite. "Continue" returns them to
  // wherever they launched Your Support from (task list or dashboard).
  extendGetContent: (req: Request) => ({ continueUrl: getYourSupportReturnUrl(req) }),
});
