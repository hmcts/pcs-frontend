import type { Request } from 'express';

import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { redirectToPcq } from '@services/pcq/redirectToPcq';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'reasonable-adjustments-confirmation',
  stepDir: __dirname,
  fields: [],
  customTemplate: `${__dirname}/reasonableAdjustmentsConfirmation.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    submittedCaption: 'submittedCaption',
    whatHappensNextHeading: 'whatHappensNextHeading',
    whatHappensNextParagraph1: 'whatHappensNextParagraph1',
    whatHappensNextParagraph2: 'whatHappensNextParagraph2',
  },
  // Having finished Your Support, "Save and continue" hands the citizen to PCQ
  beforeRedirect: async (req: Request) => {
    if (req.body?.action === 'saveForLater') {
      return;
    }
    await redirectToPcq(req);
  },
  // "Save and continue" returns the citizen to their response journey at language-used.
  resolveRedirectAfterPost: async req => {
    const caseReference = req.res?.locals.validatedCase?.id;
    return caseReference ? `/case/${caseReference}/respond-to-claim/task-list` : undefined;
  },
});
